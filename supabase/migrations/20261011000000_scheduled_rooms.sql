-- Scheduled rooms, weekly groups and reminders (docs/design/pages/tabs.md, circle-detail.md,
-- start-something.md; Sammy's decision, 2026-10-08). Safe to run more than once.
--
-- - A scheduled room is a room set for a time ("Ludo night, 8 pm"). Its live room opens when the
--   first person goes in, from 5 minutes before (the room server does that).
-- - A weekly group meets on set days at a set time; each meeting is a scheduled room, made a week ahead.
-- - Regulars are the people who joined a group. A reminder is one person's "Remind me" for one room.
-- Never support rooms: those are only reached through the support door (CLAUDE.md, Never list).
-- Who set a reminder, and who is a regular, is never shown to anyone: only counts.
-- The app reads all of this through the functions below; the tables themselves are closed to it,
-- except a person's own reminders and own group places.

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  door text not null check (door in ('talk', 'play', 'learn')),
  topic text,
  language text,
  level text,
  capacity int not null default 6 check (capacity between 2 and 10),
  -- Days of the week it meets, 0 = Sunday to 6 = Saturday, and the time there.
  days smallint[] not null check (array_length(days, 1) between 1 and 7 and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  start_time time not null,
  time_zone text not null default 'Africa/Lagos' check (char_length(time_zone) <= 64),
  private boolean not null default false,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table public.groups enable row level security;

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

create table if not exists public.scheduled_rooms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade,
  door text not null check (door in ('talk', 'play', 'learn')),
  title text not null check (char_length(title) between 3 and 40),
  topic text,
  language text,
  level text,
  capacity int not null default 6 check (capacity between 2 and 10),
  starts_at timestamptz not null,
  private boolean not null default false,
  created_by uuid not null references auth.users (id) on delete cascade,
  -- The live room, once someone has gone in.
  room_id text references public.rooms (id) on delete set null,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, starts_at)
);
alter table public.scheduled_rooms enable row level security;
create index if not exists scheduled_rooms_starts on public.scheduled_rooms (starts_at) where not cancelled;

create table if not exists public.reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  scheduled_id uuid not null references public.scheduled_rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, scheduled_id)
);
alter table public.reminders enable row level security;

-- Your own reminders and group places only.
drop policy if exists "reminders: own" on public.reminders;
create policy "reminders: own" on public.reminders for select to authenticated using (user_id = auth.uid());
drop policy if exists "group_members: own" on public.group_members;
create policy "group_members: own" on public.group_members for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.reminders, public.group_members from anon, authenticated;
revoke all on public.groups, public.scheduled_rooms from anon, authenticated;

-- Can this person see this scheduled room? Public ones, or private ones they made, are a regular of,
-- or set a reminder for (they had the link). Never one made by someone they blocked or who blocked them.
create or replace function public.can_see_scheduled(p_room public.scheduled_rooms, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_user and b.blocked_id = p_room.created_by)
         or (b.blocker_id = p_room.created_by and b.blocked_id = p_user)
    )
    and (
      not p_room.private
      or p_room.created_by = p_user
      or exists (select 1 from public.group_members m where m.group_id = p_room.group_id and m.user_id = p_user)
      or exists (select 1 from public.reminders r where r.scheduled_id = p_room.id and r.user_id = p_user)
    );
$$;
revoke all on function public.can_see_scheduled(public.scheduled_rooms, uuid) from public, anon, authenticated;

-- Weekly groups: make the meetings for the next week (each one is a scheduled room).
create or replace function public.ensure_meetings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scheduled_rooms (group_id, door, title, topic, language, level, capacity, starts_at, private, created_by)
  select g.id, g.door, g.name, g.topic, g.language, g.level, g.capacity,
         ((((now() at time zone g.time_zone)::date + d) + g.start_time) at time zone g.time_zone),
         g.private, g.created_by
  from public.groups g
  cross join generate_series(0, 7) as d
  where g.ended_at is null
    and extract(dow from ((now() at time zone g.time_zone)::date + d))::smallint = any (g.days)
    and ((((now() at time zone g.time_zone)::date + d) + g.start_time) at time zone g.time_zone) > now() - interval '2 hours'
  on conflict (group_id, starts_at) do nothing;
end;
$$;
revoke all on function public.ensure_meetings() from public, anon, authenticated;

-- What's coming up: scheduled rooms from 2 hours ago (still going) until p_until. Only counts of who's
-- going, never who; the host's nickname only.
create or replace function public.upcoming_rooms(p_until timestamptz)
returns table (
  id uuid,
  group_id uuid,
  door text,
  title text,
  topic text,
  language text,
  level text,
  capacity int,
  starts_at timestamptz,
  private boolean,
  host_nickname text,
  going int,
  reminded boolean,
  regular boolean,
  mine boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform public.ensure_meetings();
  return query
  select s.id, s.group_id, s.door, s.title, s.topic, s.language, s.level, s.capacity, s.starts_at, s.private,
         p.nickname,
         (select count(*)::int from (
            select r.user_id from public.reminders r where r.scheduled_id = s.id
            union
            select m.user_id from public.group_members m where m.group_id = s.group_id
          ) going_people),
         exists (select 1 from public.reminders r where r.scheduled_id = s.id and r.user_id = auth.uid()),
         exists (select 1 from public.group_members m where m.group_id = s.group_id and m.user_id = auth.uid()),
         s.created_by = auth.uid()
  from public.scheduled_rooms s
  left join public.profiles p on p.id = s.created_by
  left join public.groups g on g.id = s.group_id
  where not s.cancelled
    and (g.id is null or g.ended_at is null)
    and s.starts_at > now() - interval '2 hours'
    and s.starts_at <= least(p_until, now() + interval '8 days')
    and public.can_see_scheduled(s, auth.uid())
  order by s.starts_at
  limit 200;
end;
$$;
revoke all on function public.upcoming_rooms(timestamptz) from public, anon;
grant execute on function public.upcoming_rooms(timestamptz) to authenticated;

-- Weekly groups to browse and your own: with the regulars count (never who), and the next meeting.
create or replace function public.list_groups()
returns table (
  id uuid,
  name text,
  door text,
  topic text,
  language text,
  level text,
  capacity int,
  days smallint[],
  start_time time,
  time_zone text,
  private boolean,
  host_nickname text,
  regulars int,
  regular boolean,
  mine boolean,
  next_id uuid,
  next_starts_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform public.ensure_meetings();
  return query
  select g.id, g.name, g.door, g.topic, g.language, g.level, g.capacity, g.days, g.start_time, g.time_zone, g.private,
         p.nickname,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = auth.uid()),
         g.created_by = auth.uid(),
         n.id,
         n.starts_at
  from public.groups g
  left join public.profiles p on p.id = g.created_by
  left join lateral (
    select s.id, s.starts_at from public.scheduled_rooms s
    where s.group_id = g.id and not s.cancelled and s.starts_at > now() - interval '2 hours'
    order by s.starts_at limit 1
  ) n on true
  where g.ended_at is null
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
         or (b.blocker_id = g.created_by and b.blocked_id = auth.uid())
    )
    and (not g.private or g.created_by = auth.uid()
         or exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = auth.uid()))
  order by n.starts_at nulls last
  limit 100;
end;
$$;
revoke all on function public.list_groups() from public, anon;
grant execute on function public.list_groups() to authenticated;

-- Remind me (on or off) for one scheduled room you can see.
create or replace function public.set_reminder(p_scheduled uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.scheduled_rooms;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if not p_on then
    delete from public.reminders where user_id = auth.uid() and scheduled_id = p_scheduled;
    return;
  end if;
  select * into s from public.scheduled_rooms where id = p_scheduled;
  -- A private room's reminder only comes from its link (the room server), so here it must be visible already.
  if s.id is null or s.cancelled or s.starts_at < now() - interval '2 hours' or not public.can_see_scheduled(s, auth.uid()) then
    raise exception 'not_found';
  end if;
  insert into public.reminders (user_id, scheduled_id) values (auth.uid(), p_scheduled) on conflict do nothing;
end;
$$;
revoke all on function public.set_reminder(uuid, boolean) from public, anon;
grant execute on function public.set_reminder(uuid, boolean) to authenticated;

-- Join a weekly group (become a regular), or leave it. A group is full when its regulars reach its size.
create or replace function public.join_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select * into g from public.groups where id = p_group and ended_at is null;
  if g.id is null
     or (g.private and g.created_by <> auth.uid())
     or exists (
       select 1 from public.blocks b
       where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
          or (b.blocker_id = g.created_by and b.blocked_id = auth.uid())
     ) then
    raise exception 'not_found';
  end if;
  if exists (select 1 from public.group_members where group_id = p_group and user_id = auth.uid()) then
    return;
  end if;
  if (select count(*) from public.group_members where group_id = p_group) >= g.capacity then
    raise exception 'group_full';
  end if;
  insert into public.group_members (group_id, user_id) values (p_group, auth.uid());
end;
$$;
revoke all on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;

create or replace function public.leave_group(p_group uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.group_members where group_id = p_group and user_id = auth.uid();
$$;
revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;

-- The person who made it can cancel a scheduled room, or end a weekly group (its future meetings go too).
create or replace function public.cancel_scheduled(p_scheduled uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.scheduled_rooms set cancelled = true
  where id = p_scheduled and created_by = auth.uid() and starts_at > now();
$$;
revoke all on function public.cancel_scheduled(uuid) from public, anon;
grant execute on function public.cancel_scheduled(uuid) to authenticated;

create or replace function public.end_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.groups set ended_at = now() where id = p_group and created_by = auth.uid() and ended_at is null;
  if found then
    update public.scheduled_rooms set cancelled = true where group_id = p_group and starts_at > now();
  end if;
end;
$$;
revoke all on function public.end_group(uuid) from public, anon;
grant execute on function public.end_group(uuid) to authenticated;
