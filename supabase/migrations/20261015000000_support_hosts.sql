-- Support: becoming a host, host profiles, "Notify me", and one-on-one sessions.
-- Sammy's decisions: docs/CIRCLES_INTENT.md › Support. Details: docs/support-section-spec.md.
--   - Support rooms stay free and need a host plus 2 others (unchanged).
--   - One-on-one is optional, only with a trusted host (5+ support rooms hosted, no upheld reports) or a
--     professional whose real details are shown. Free or paid by time, price agreed before it starts.
--   - Paid sessions need a payment provider, which isn't connected yet: asking for a paid one is refused
--     with 'payment_needed' until it is.
-- The team reviews applications in the Supabase dashboard (Table editor › host_applications: set
-- status to approved, needs_changes or rejected). Approving makes the person a host.
-- Safe to run more than once.

-- One-on-one rooms hold 2: the host and one person. Every other room still holds 3 to 12. ------------
alter table public.rooms drop constraint if exists rooms_kind_check;
alter table public.rooms add constraint rooms_kind_check check (kind in ('peer', 'hosted', 'one_on_one'));
alter table public.rooms drop constraint if exists rooms_capacity_check;
alter table public.rooms add constraint rooms_capacity_check
  check (capacity between 3 and 12 or (kind = 'one_on_one' and capacity = 2));

-- Applications ------------------------------------------------------------------------------------
create table if not exists public.host_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('listener', 'professional')),
  intro text not null check (char_length(intro) between 10 and 150),
  topics text[] not null check (cardinality(topics) between 1 and 10),
  languages text[] not null check (cardinality(languages) between 1 and 10),
  why text not null check (char_length(why) between 10 and 500),
  -- Professionals only, and shown to everyone once approved (CIRCLES_INTENT.md › Support).
  full_name text check (full_name is null or char_length(full_name) between 3 and 80),
  credential text check (credential is null or char_length(credential) between 2 and 120),
  issuing_body text check (issuing_body is null or char_length(issuing_body) between 2 and 120),
  licence_number text check (licence_number is null or char_length(licence_number) between 2 and 60),
  training_passed boolean not null check (training_passed),
  agreed boolean not null check (agreed),
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_changes', 'rejected')),
  -- Written by the team; the applicant sees it with "Needs changes".
  review_note text check (review_note is null or char_length(review_note) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint host_applications_professional check (
    kind = 'listener' or (full_name is not null and credential is not null and issuing_body is not null and licence_number is not null)
  )
);
create unique index if not exists host_applications_one_pending on public.host_applications (user_id) where status = 'pending';
alter table public.host_applications enable row level security;
drop policy if exists "host applications: read own" on public.host_applications;
create policy "host applications: read own" on public.host_applications
  for select to authenticated using (user_id = auth.uid());
-- No insert or update policies: applying goes through submit_host_application; reviewing is the team's.

-- Host profiles: what people see on a host's card. -----------------------------------------------
create table if not exists public.host_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kind text not null check (kind in ('listener', 'professional')),
  full_name text,
  credential text,
  issuing_body text,
  intro text not null default '' check (char_length(intro) <= 150),
  topics text[] not null default '{}',
  languages text[] not null default '{}',
  offers_one_on_one boolean not null default false,
  session_minutes int not null default 30 check (session_minutes in (20, 30, 45, 60)),
  -- Whole naira for one session. Trained listeners are always free.
  price_naira int not null default 0 check (price_naira between 0 and 200000),
  -- A professional's first session with someone can be free; it's a full session, never cut short.
  free_first boolean not null default false,
  -- "Go online": listed for one-on-one until this time.
  online_until timestamptz,
  -- The team can switch someone's one-on-one off without removing them as a host.
  one_on_one_blocked boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint host_profiles_listeners_free check (kind = 'professional' or (price_naira = 0 and not free_first))
);
alter table public.host_profiles enable row level security;
-- No policies: cards are read through host_card and list_one_on_one_hosts, changed through
-- update_my_host_profile and set_host_online.

-- Approving an application makes the person a host, with a profile from what they wrote.
create or replace function public.on_host_application_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.hosts (user_id, note) values (new.user_id, 'Approved application')
    on conflict (user_id) do nothing;
    insert into public.host_profiles as hp (user_id, kind, full_name, credential, issuing_body, intro, topics, languages)
    values (new.user_id, new.kind, new.full_name, new.credential, new.issuing_body, new.intro, new.topics, new.languages)
    on conflict (user_id) do update set
      kind = excluded.kind, full_name = excluded.full_name, credential = excluded.credential,
      issuing_body = excluded.issuing_body, intro = excluded.intro, topics = excluded.topics,
      languages = excluded.languages, updated_at = now(),
      -- A listener who was a professional before can't keep charging.
      price_naira = case when excluded.kind = 'listener' then 0 else hp.price_naira end,
      free_first = case when excluded.kind = 'listener' then false else hp.free_first end;
  end if;
  return new;
end;
$$;
drop trigger if exists host_application_review on public.host_applications;
create trigger host_application_review before update on public.host_applications
  for each row execute function public.on_host_application_review();

create or replace function public.submit_host_application(
  p_kind text,
  p_intro text,
  p_topics text[],
  p_languages text[],
  p_why text,
  p_full_name text,
  p_credential text,
  p_issuing_body text,
  p_licence_number text,
  p_training_passed boolean,
  p_agreed boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  dob date;
  new_id uuid;
  pro boolean := p_kind = 'professional';
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if public.is_banned(uid) then raise exception 'paused'; end if;
  if not exists (select 1 from public.profiles where id = uid and nickname is not null) then raise exception 'no_nickname'; end if;
  -- 18+ only (support-section-spec.md › Safety rules).
  select date_of_birth into dob from public.birth_dates where id = uid;
  if dob is null or dob > (current_date - interval '18 years')::date then raise exception 'adults_only'; end if;
  if exists (select 1 from public.hosts where user_id = uid) then raise exception 'already_host'; end if;
  if exists (select 1 from public.host_applications where user_id = uid and status = 'pending') then raise exception 'already_pending'; end if;
  if not coalesce(p_training_passed, false) then raise exception 'training_needed'; end if;
  if not coalesce(p_agreed, false) then raise exception 'agreement_needed'; end if;
  insert into public.host_applications (user_id, kind, intro, topics, languages, why, full_name, credential, issuing_body,
    licence_number, training_passed, agreed)
  values (uid, p_kind, btrim(p_intro), p_topics, p_languages, btrim(p_why),
    case when pro then nullif(btrim(p_full_name), '') end,
    case when pro then nullif(btrim(p_credential), '') end,
    case when pro then nullif(btrim(p_issuing_body), '') end,
    case when pro then nullif(btrim(p_licence_number), '') end,
    true, true)
  returning id into new_id;
  return new_id;
end;
$$;

-- Support rooms someone has hosted: one row per host, room and day once the room reached 3 people
-- (the room server writes it). One-on-one unlocks for trained listeners at 5 (CIRCLES_INTENT.md › Support).
create table if not exists public.support_host_sessions (
  host_id uuid not null references auth.users (id) on delete cascade,
  room_id text not null,
  on_day date not null default current_date,
  primary key (host_id, room_id, on_day)
);
alter table public.support_host_sessions enable row level security;

create or replace function public.rooms_hosted(p_user uuid)
returns int
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int from public.support_host_sessions where host_id = p_user;
$$;

-- Trusted for one-on-one: still a host, not paused, not switched off by the team, no upheld reports,
-- and a professional or a listener who has hosted at least 5 support rooms.
create or replace function public.one_on_one_trusted(p_user uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.host_profiles hp
    join public.hosts h on h.user_id = hp.user_id
    where hp.user_id = p_user
      and not hp.one_on_one_blocked
      and not public.is_banned(p_user)
      and not exists (select 1 from public.reports r where r.reported_user_id = p_user and r.status = 'actioned')
      and (hp.kind = 'professional' or public.rooms_hosted(p_user) >= 5)
  );
$$;

-- One-on-one requests, and how each went (a rating is shown on a card once a host has 5). ----------
create table if not exists public.one_on_one_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  minutes int not null check (minutes in (20, 30, 45, 60)),
  price_naira int not null default 0 check (price_naira >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  room_id text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  ends_at timestamptz,
  rating int check (rating is null or rating between 1 and 5),
  helpful boolean
);
create index if not exists one_on_one_requests_host on public.one_on_one_requests (host_id, status, created_at desc);
-- One waiting request per person, even if two arrive at the same moment.
create unique index if not exists one_on_one_requests_one_pending on public.one_on_one_requests (user_id) where status = 'pending';
create index if not exists one_on_one_requests_user on public.one_on_one_requests (user_id, created_at desc);
alter table public.one_on_one_requests enable row level security;
-- No policies: both sides use the functions below, which only ever show the two people their own requests.

-- A request nobody answered for 10 minutes runs out.
create or replace function public.expire_one_on_one()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.one_on_one_requests set status = 'expired', responded_at = now()
  where status = 'pending' and created_at < now() - interval '10 minutes';
$$;

-- A host's card. Anyone signed in can see a host's card; a professional's real details are part of it.
create or replace function public.host_card(p_user uuid)
returns table (
  user_id uuid, nickname text, kind text, full_name text, credential text, issuing_body text, intro text,
  topics text[], languages text[], one_on_one boolean, online boolean, minutes int, price_naira int,
  free_first boolean, sessions int, rating numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select hp.user_id, p.nickname, hp.kind,
    case when hp.kind = 'professional' then hp.full_name end,
    case when hp.kind = 'professional' then hp.credential end,
    case when hp.kind = 'professional' then hp.issuing_body end,
    hp.intro, hp.topics, hp.languages,
    hp.offers_one_on_one and public.one_on_one_trusted(hp.user_id),
    coalesce(hp.online_until > now(), false),
    hp.session_minutes, hp.price_naira, hp.free_first,
    (select count(*)::int from public.one_on_one_requests q where q.host_id = hp.user_id and q.status = 'accepted' and q.ends_at < now()),
    -- Only once there are 5 ratings, so one bad night doesn't define anyone.
    (select case when count(q.rating) >= 5 then round(avg(q.rating), 1) end from public.one_on_one_requests q where q.host_id = hp.user_id)
  from public.host_profiles hp
  join public.hosts h on h.user_id = hp.user_id
  join public.profiles p on p.id = hp.user_id
  where hp.user_id = p_user and auth.uid() is not null and not public.is_banned(hp.user_id);
$$;

-- Hosts you can ask for one-on-one right now: trusted, offering it, online, and nobody either of you blocked.
create or replace function public.list_one_on_one_hosts()
returns table (
  user_id uuid, nickname text, kind text, full_name text, credential text, issuing_body text, intro text,
  topics text[], languages text[], one_on_one boolean, online boolean, minutes int, price_naira int,
  free_first boolean, sessions int, rating numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select c.*
  from public.host_profiles hp
  cross join lateral public.host_card(hp.user_id) c
  where hp.offers_one_on_one
    and hp.online_until > now()
    and hp.user_id <> auth.uid()
    and c.one_on_one
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = hp.user_id) or (b.blocker_id = hp.user_id and b.blocked_id = auth.uid())
    )
  order by (c.kind = 'listener') desc, c.price_naira, c.nickname;
$$;

-- Where you are as a host or applicant, for the Me tab.
create or replace function public.my_host_status()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'isHost', exists (select 1 from public.hosts where user_id = auth.uid()),
    'application', (
      select jsonb_build_object('status', a.status, 'kind', a.kind, 'note', a.review_note, 'at', a.created_at)
      from public.host_applications a where a.user_id = auth.uid() order by a.created_at desc limit 1
    ),
    'profile', (
      select jsonb_build_object(
        'kind', hp.kind, 'intro', hp.intro, 'topics', hp.topics, 'languages', hp.languages,
        'offers', hp.offers_one_on_one, 'minutes', hp.session_minutes, 'price', hp.price_naira,
        'freeFirst', hp.free_first, 'online', coalesce(hp.online_until > now(), false)
      )
      from public.host_profiles hp where hp.user_id = auth.uid()
    ),
    'hosted', public.rooms_hosted(auth.uid()),
    'trusted', public.one_on_one_trusted(auth.uid())
  );
$$;

create or replace function public.update_my_host_profile(
  p_intro text,
  p_topics text[],
  p_languages text[],
  p_offers boolean,
  p_minutes int,
  p_price int,
  p_free_first boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  select kind into k from public.host_profiles where user_id = uid;
  if k is null or not exists (select 1 from public.hosts where user_id = uid) then raise exception 'not_host'; end if;
  if char_length(btrim(coalesce(p_intro, ''))) > 150 then raise exception 'bad_intro'; end if;
  if cardinality(p_topics) > 10 or cardinality(p_languages) > 10 then raise exception 'too_many'; end if;
  -- Trained listeners are always free (CIRCLES_INTENT.md › Support).
  if k = 'listener' and (coalesce(p_price, 0) <> 0 or coalesce(p_free_first, false)) then raise exception 'listeners_free'; end if;
  update public.host_profiles set
    intro = btrim(coalesce(p_intro, '')), topics = coalesce(p_topics, '{}'), languages = coalesce(p_languages, '{}'),
    offers_one_on_one = coalesce(p_offers, false), session_minutes = p_minutes, price_naira = coalesce(p_price, 0),
    free_first = coalesce(p_free_first, false), updated_at = now()
  where user_id = uid;
end;
$$;

-- Go online for one-on-one for the next 4 hours, or go offline.
create or replace function public.set_host_online(p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosts where user_id = auth.uid()) then raise exception 'not_host'; end if;
  update public.host_profiles set online_until = case when p_on then now() + interval '4 hours' end, updated_at = now()
  where user_id = auth.uid();
end;
$$;

-- Ask for one-on-one. Returns the request's id.
create or replace function public.request_one_on_one(p_host uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  dob date;
  hp public.host_profiles;
  price int;
  new_id uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if uid = p_host then raise exception 'not_yourself'; end if;
  if public.is_banned(uid) then raise exception 'paused'; end if;
  select date_of_birth into dob from public.birth_dates where id = uid;
  if dob is null or dob > (current_date - interval '18 years')::date then raise exception 'adults_only'; end if;
  perform public.expire_one_on_one();
  select * into hp from public.host_profiles where user_id = p_host;
  if hp.user_id is null or not hp.offers_one_on_one or not coalesce(hp.online_until > now(), false)
     or not public.one_on_one_trusted(p_host) then
    raise exception 'not_available';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = uid and b.blocked_id = p_host) or (b.blocker_id = p_host and b.blocked_id = uid)
  ) then raise exception 'not_available'; end if;
  if exists (select 1 from public.one_on_one_requests where user_id = uid and status = 'pending') then raise exception 'already_waiting'; end if;
  if (select count(*) from public.one_on_one_requests where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many';
  end if;
  -- The first session with this professional is free when they offer that.
  price := case
    when hp.free_first and not exists (
      select 1 from public.one_on_one_requests where user_id = uid and host_id = p_host and status = 'accepted'
    ) then 0
    else hp.price_naira
  end;
  -- shortcut: no payment provider yet, so paid sessions can't be asked for; connect one (Paystack) to open them.
  if price > 0 then raise exception 'payment_needed'; end if;
  insert into public.one_on_one_requests (user_id, host_id, minutes, price_naira)
  values (uid, p_host, hp.session_minutes, price)
  returning id into new_id;
  return new_id;
end;
$$;

-- Your own request: how it's going. The host is named; you never see anyone else's.
create or replace function public.my_one_on_one(p_id uuid)
returns table (status text, room_id text, host_nickname text, minutes int, ends_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expire_one_on_one();
  return query
    select q.status, q.room_id, p.nickname, q.minutes, q.ends_at
    from public.one_on_one_requests q
    join public.profiles p on p.id = q.host_id
    where q.id = p_id and q.user_id = auth.uid();
end;
$$;

create or replace function public.cancel_one_on_one(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.one_on_one_requests set status = 'cancelled', responded_at = now()
  where id = p_id and user_id = auth.uid() and status = 'pending';
$$;

-- A host's waiting requests: only the person's nickname, never more.
create or replace function public.host_requests()
returns table (id uuid, nickname text, minutes int, price_naira int, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expire_one_on_one();
  return query
    select q.id, p.nickname, q.minutes, q.price_naira, q.created_at
    from public.one_on_one_requests q
    join public.profiles p on p.id = q.user_id
    where q.host_id = auth.uid() and q.status = 'pending'
    order by q.created_at;
end;
$$;

-- The host says yes or no. Yes opens a private room for the two of them; returns its id.
create or replace function public.respond_one_on_one(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.one_on_one_requests;
  new_room text;
begin
  perform public.expire_one_on_one();
  select * into q from public.one_on_one_requests where id = p_id and host_id = auth.uid() for update;
  if q.id is null or q.status <> 'pending' then raise exception 'not_waiting'; end if;
  if not p_accept then
    update public.one_on_one_requests set status = 'declined', responded_at = now() where id = p_id;
    return null;
  end if;
  if not public.one_on_one_trusted(auth.uid()) then raise exception 'not_available'; end if;
  -- Blocked since they asked: no session.
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = q.user_id and b.blocked_id = q.host_id) or (b.blocker_id = q.host_id and b.blocked_id = q.user_id)
  ) then
    update public.one_on_one_requests set status = 'declined', responded_at = now() where id = p_id;
    return null;
  end if;
  new_room := gen_random_uuid()::text;
  insert into public.rooms (id, door, kind, title, capacity, status, private, created_by, livekit_room_name)
  values (new_room, 'support', 'one_on_one', 'One-on-one', 2, 'open', true, auth.uid(), 'circles-' || new_room);
  update public.one_on_one_requests
  set status = 'accepted', responded_at = now(), room_id = new_room, ends_at = now() + make_interval(mins => q.minutes)
  where id = p_id;
  return new_room;
end;
$$;

-- After a session: how it went. Once, and only by the person who asked.
create or replace function public.rate_one_on_one(p_id uuid, p_rating int, p_helpful boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then raise exception 'bad_rating'; end if;
  update public.one_on_one_requests set rating = p_rating, helpful = p_helpful
  where id = p_id and user_id = auth.uid() and status = 'accepted' and rating is null and helpful is null;
end;
$$;

-- "Notify me when a host is on": the room server sends one alert when a host opens a support room,
-- then forgets the list. Nobody can read it from the app. ---------------------------------------
create table if not exists public.support_notify (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.support_notify enable row level security;

create or replace function public.support_notify_me()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.support_notify (user_id) select auth.uid() where auth.uid() is not null
  on conflict (user_id) do update set created_at = now();
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.submit_host_application(text, text, text[], text[], text, text, text, text, text, boolean, boolean)',
    'public.host_card(uuid)',
    'public.list_one_on_one_hosts()',
    'public.my_host_status()',
    'public.update_my_host_profile(text, text[], text[], boolean, int, int, boolean)',
    'public.set_host_online(boolean)',
    'public.request_one_on_one(uuid)',
    'public.my_one_on_one(uuid)',
    'public.cancel_one_on_one(uuid)',
    'public.host_requests()',
    'public.respond_one_on_one(uuid, boolean)',
    'public.rate_one_on_one(uuid, int, boolean)',
    'public.support_notify_me()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'public.on_host_application_review()', 'public.rooms_hosted(uuid)', 'public.one_on_one_trusted(uuid)',
    'public.expire_one_on_one()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;
