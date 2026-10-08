-- Invitations (docs/design/pages/tabs.md › Groups › Invitations): "Ada_K invited you to Ludo night".
-- Only people who saved each other can invite each other. Never from or to a support room. They
-- expire when the room ends (a live room, or a scheduled room's time has passed) or the group ends.
-- Shown inside the app for now; a push alert comes later, with Firebase.
-- Safe to run more than once.

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  -- Exactly one of: a live room, a scheduled room, a weekly group.
  room_id text references public.rooms (id) on delete cascade,
  scheduled_id uuid references public.scheduled_rooms (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- "Not now", or used.
  dismissed_at timestamptz,
  check (num_nonnulls(room_id, scheduled_id, group_id) = 1),
  check (from_user <> to_user)
);
-- One invitation per person per room or group, whoever sent it first.
create unique index if not exists invitations_room_once on public.invitations (to_user, room_id) where room_id is not null;
create unique index if not exists invitations_scheduled_once on public.invitations (to_user, scheduled_id) where scheduled_id is not null;
create unique index if not exists invitations_group_once on public.invitations (to_user, group_id) where group_id is not null;
create index if not exists invitations_from_recent on public.invitations (from_user, created_at);

alter table public.invitations enable row level security;
-- Nothing is read or written directly: my_invitations, dismiss_invitation and send_invitations only.
revoke all on public.invitations from anon, authenticated;

-- Private scheduled rooms and groups are open to the people invited to them (or to their group).
create or replace function public.invited_to(p_user uuid, p_scheduled uuid, p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invitations i
    where i.to_user = p_user
      and ((p_scheduled is not null and i.scheduled_id = p_scheduled) or (p_group is not null and i.group_id = p_group))
  );
$$;
revoke all on function public.invited_to(uuid, uuid, uuid) from public, anon, authenticated;

-- Sending: only the room server calls this (it first checks the sender really is in a live room).
-- Returns how many invitations were sent. People who aren't mutual saves, are blocked either way, or
-- were removed from Circles are skipped without saying so.
create or replace function public.send_invitations(p_from uuid, p_to uuid[], p_room text, p_scheduled uuid, p_group uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rooms;
  s public.scheduled_rooms;
  g public.groups;
  sent int;
begin
  if num_nonnulls(p_room, p_scheduled, p_group) <> 1 or coalesce(array_length(p_to, 1), 0) = 0 then
    raise exception 'bad_invite';
  end if;
  if array_length(p_to, 1) > 20 then
    raise exception 'too_many';
  end if;
  if public.is_banned(p_from) or not exists (select 1 from public.profiles where id = p_from and nickname is not null) then
    raise exception 'not_allowed';
  end if;
  -- At most 40 invitations an hour from one person.
  if (select count(*) from public.invitations where from_user = p_from and created_at > now() - interval '1 hour')
     + array_length(p_to, 1) > 40 then
    raise exception 'too_many';
  end if;

  if p_room is not null then
    select * into r from public.rooms where id = p_room;
    -- Never a support room (CLAUDE.md, Never list): an invitation would show where the sender is.
    if r.id is null or r.status <> 'open' or r.door = 'support' then
      raise exception 'ended';
    end if;
  elsif p_scheduled is not null then
    select * into s from public.scheduled_rooms where id = p_scheduled;
    if s.id is null or s.cancelled or s.starts_at < now() - interval '2 hours' or not public.can_see_scheduled(s, p_from)
       or exists (select 1 from public.groups gg where gg.id = s.group_id and gg.ended_at is not null) then
      raise exception 'ended';
    end if;
  else
    select * into g from public.groups where id = p_group;
    if g.id is null or g.ended_at is not null or public.is_banned(g.created_by)
       or not (g.created_by = p_from or exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = p_from)) then
      raise exception 'ended';
    end if;
  end if;

  with people as (
    select distinct t.id
    from unnest(p_to) as t(id)
    where t.id <> p_from
      -- Saved each other.
      and exists (select 1 from public.saves a where a.saver_id = p_from and a.saved_id = t.id)
      and exists (select 1 from public.saves b where b.saver_id = t.id and b.saved_id = p_from)
      and not exists (
        select 1 from public.blocks k
        where (k.blocker_id = p_from and k.blocked_id = t.id) or (k.blocker_id = t.id and k.blocked_id = p_from)
      )
      and not public.is_banned(t.id)
  ),
  added as (
    insert into public.invitations (from_user, to_user, room_id, scheduled_id, group_id)
    select p_from, people.id, p_room, p_scheduled, p_group from people
    on conflict do nothing
    returning 1
  )
  select count(*)::int into sent from added;
  return sent;
end;
$$;
revoke all on function public.send_invitations(uuid, uuid[], text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.send_invitations(uuid, uuid[], text, uuid, uuid) to service_role;

-- Your invitations that can still be used, newest first. Only the sender's nickname, never who else
-- was invited or who is in the room.
create or replace function public.my_invitations()
returns table (
  id uuid,
  from_nickname text,
  kind text,
  title text,
  door text,
  room_id text,
  scheduled_id uuid,
  group_id uuid,
  starts_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id,
         p.nickname,
         case when i.room_id is not null then 'room' when i.scheduled_id is not null then 'scheduled' else 'group' end,
         coalesce(r.title, s.title, g.name),
         coalesce(r.door, s.door, g.door),
         i.room_id,
         i.scheduled_id,
         i.group_id,
         s.starts_at,
         i.created_at
  from public.invitations i
  join public.profiles p on p.id = i.from_user
  left join public.rooms r on r.id = i.room_id
  left join public.scheduled_rooms s on s.id = i.scheduled_id
  left join public.groups g on g.id = i.group_id
  left join public.groups sg on sg.id = s.group_id
  where i.to_user = auth.uid()
    and i.dismissed_at is null
    and not public.is_banned(i.from_user)
    and not exists (
      select 1 from public.blocks k
      where (k.blocker_id = auth.uid() and k.blocked_id = i.from_user) or (k.blocker_id = i.from_user and k.blocked_id = auth.uid())
    )
    and (
      -- A live room: while it's open, for up to 3 hours.
      (i.room_id is not null and r.status = 'open' and r.door <> 'support' and i.created_at > now() - interval '3 hours')
      -- A scheduled room: until 2 hours after it starts.
      or (i.scheduled_id is not null and not s.cancelled and s.starts_at > now() - interval '2 hours'
          and (sg.id is null or sg.ended_at is null) and not public.is_banned(s.created_by))
      -- A group: until it ends, or you join it.
      or (i.group_id is not null and g.ended_at is null and not public.is_banned(g.created_by)
          and not exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = auth.uid()))
    )
  order by i.created_at desc
  limit 20;
$$;
revoke all on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

-- "Not now", or after using it.
create or replace function public.dismiss_invitation(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invitations set dismissed_at = now() where id = p_id and to_user = auth.uid() and dismissed_at is null;
$$;
revoke all on function public.dismiss_invitation(uuid) from public, anon;
grant execute on function public.dismiss_invitation(uuid) to authenticated;
