-- The Me page (docs/me-page-spec.md): your look (a colour and a symbol, never a photo), changing your
-- nickname, which alerts you get, and "Report a problem" for the team. Safe to run more than once.

-- Your look: one of the app's avatar colours and, if you like, a symbol instead of your initial.
alter table public.profiles add column if not exists avatar_tint smallint;
alter table public.profiles add column if not exists avatar_symbol text;
alter table public.profiles add column if not exists nickname_changed_at timestamptz;
alter table public.profiles drop constraint if exists profiles_avatar_tint_check;
alter table public.profiles add constraint profiles_avatar_tint_check check (avatar_tint is null or avatar_tint between 0 and 5);
alter table public.profiles drop constraint if exists profiles_avatar_symbol_check;
alter table public.profiles add constraint profiles_avatar_symbol_check check (avatar_symbol is null or avatar_symbol in
  ('sun', 'moon', 'star', 'leaf', 'flower', 'waves', 'flame', 'music', 'coffee', 'cat', 'bird', 'fish'));

-- Everyone's look, for drawing avatars. Nothing else about anyone.
create or replace function public.avatars_of(p_ids uuid[])
returns table (id uuid, tint smallint, symbol text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.avatar_tint, p.avatar_symbol
  from public.profiles p
  where p.id = any (p_ids[1:100]) and auth.uid() is not null;
$$;

-- Your own nickname and look. A new nickname at most once a week, so nobody can hide behind a new
-- one after every report. Same rules as the first one (set_nickname).
create or replace function public.update_my_profile(p_nickname text, p_tint smallint, p_symbol text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean text := trim(p_nickname);
  current_nick text;
  changed_at timestamptz;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  -- A paused account can't take on a new name.
  if public.is_banned(uid) then raise exception 'paused'; end if;
  -- Locked, so two saves at once can't both pass the once-a-week check.
  select nickname, nickname_changed_at into current_nick, changed_at from public.profiles where id = uid for update;
  if current_nick is null then raise exception 'no_profile'; end if;
  if clean is distinct from current_nick then
    if clean is null or clean !~ '^[A-Za-z0-9_]{2,20}$' or clean ~ '[0-9]{7,}' then raise exception 'invalid_nickname'; end if;
    if changed_at is not null and changed_at > now() - interval '7 days' then raise exception 'too_soon'; end if;
    begin
      update public.profiles set nickname = clean, nickname_changed_at = now() where id = uid;
    exception when unique_violation then
      raise exception 'nickname_taken';
    end;
  end if;
  update public.profiles set avatar_tint = p_tint, avatar_symbol = p_symbol where id = uid;
end;
$$;

-- Old nicknames: kept for the team, and nobody else can take one for 90 days, so a stranger can't
-- pose as someone who just changed theirs.
create table if not exists public.nickname_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  nickname text not null,
  released_at timestamptz not null default now()
);
create index if not exists nickname_history_name on public.nickname_history (lower(nickname), released_at desc);
alter table public.nickname_history enable row level security;

create or replace function public.guard_nickname_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nickname is null or (tg_op = 'UPDATE' and new.nickname is not distinct from old.nickname) then
    return new;
  end if;
  if exists (
    select 1 from public.nickname_history h
    where lower(h.nickname) = lower(new.nickname) and h.user_id is distinct from new.id and h.released_at > now() - interval '90 days'
  ) then
    raise exception 'nickname_taken';
  end if;
  if tg_op = 'UPDATE' and old.nickname is not null then
    insert into public.nickname_history (user_id, nickname) values (old.id, old.nickname);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_nickname on public.profiles;
create trigger profiles_guard_nickname
  before insert or update of nickname on public.profiles
  for each row execute function public.guard_nickname_change();

-- Which alerts you want. Missing row = all on. Room reminders are set on the phone itself.
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invitations boolean not null default true,
  host_requests boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "notification prefs: read own" on public.notification_prefs;
create policy "notification prefs: read own" on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());

create or replace function public.set_notification_prefs(p_invitations boolean, p_host_requests boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_prefs (user_id, invitations, host_requests)
  select auth.uid(), coalesce(p_invitations, true), coalesce(p_host_requests, true) where auth.uid() is not null
  on conflict (user_id) do update set invitations = excluded.invitations, host_requests = excluded.host_requests, updated_at = now();
$$;

-- Help & contact › Report a problem: read by the team in the dashboard. A few a day per person.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('problem', 'question', 'idea')),
  body text not null check (char_length(body) between 5 and 1000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;

create or replace function public.send_feedback(p_kind text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from public.feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.feedback (user_id, kind, body) values (auth.uid(), p_kind, btrim(p_body));
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.avatars_of(uuid[])', 'public.update_my_profile(text, smallint, text)',
    'public.set_notification_prefs(boolean, boolean)', 'public.send_feedback(text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  execute 'revoke all on function public.guard_nickname_change() from public, anon, authenticated';
end;
$$;

-- Friends see each other's current nickname, not the one saved at the time (nicknames can change now).
create or replace function public.my_connections()
returns table (person_id uuid, nickname text)
language sql
security definer
set search_path = ''
stable
as $$
  select mine.saved_id, coalesce(p.nickname, mine.saved_nickname)
  from public.saves mine
  join public.saves theirs on theirs.saver_id = mine.saved_id and theirs.saved_id = mine.saver_id
  left join public.profiles p on p.id = mine.saved_id
  where mine.saver_id = auth.uid();
$$;
