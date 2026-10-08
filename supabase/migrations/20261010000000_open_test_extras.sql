-- Open-test extras: keeping reports safe, and rooms people start themselves (Start something).
-- Safe to run more than once.

-- Reports stay when the person who sent them deletes their account ----------------------------
-- Before, deleting your account also deleted the reports you had sent, so someone who was harassed
-- and then left Circles would wipe their own report. Now the report stays, without the account.
alter table public.reports alter column reporter_id drop not null;
alter table public.reports drop constraint if exists reports_reporter_id_fkey;
alter table public.reports
  add constraint reports_reporter_id_fkey foreign key (reporter_id) references auth.users (id) on delete set null;

-- Nicknames that could pass for the Circles team are refused ----------------------------------
-- The app checks the same list (src/lib/validation.ts) to give a friendly message first.
create or replace function public.refuse_reserved_nickname()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.nickname is not null and (
    lower(new.nickname) ~ '(circles|admin|moderator|official)'
    or lower(new.nickname) in ('host', 'support', 'team', 'staff', 'mod', 'help', 'helpline', 'system')
  ) then
    raise exception 'reserved_nickname';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_reserved_nickname on public.profiles;
create trigger profiles_reserved_nickname
  before insert or update of nickname on public.profiles
  for each row execute function public.refuse_reserved_nickname();

-- Start something: rooms people start themselves ----------------------------------------------
-- custom: started by a person with their own title. Never filled by matching; found in the door's
--   "Open now" list, or by link.
-- private: "Invite only". Never listed, never matched, never readable from the app. Only a link opens it.
-- topic: the topic tag a person chose for a Talk room (football, faith, …).
alter table public.rooms add column if not exists custom boolean not null default false;
alter table public.rooms add column if not exists private boolean not null default false;
alter table public.rooms add column if not exists topic text;
alter table public.rooms drop constraint if exists rooms_topic_check;
alter table public.rooms add constraint rooms_topic_check check (topic is null or topic in
  ('football', 'music', 'movies', 'faith', 'relationships', 'work', 'money', 'politics', 'tech', 'other'));
alter table public.rooms drop constraint if exists rooms_title_check;
alter table public.rooms add constraint rooms_title_check check (title is null or char_length(title) <= 40);
-- Support rooms are only ever opened by the server for trained hosts, never by a person.
alter table public.rooms drop constraint if exists rooms_custom_door_check;
alter table public.rooms add constraint rooms_custom_door_check check (not custom or door in ('talk', 'play'));

drop policy if exists "rooms: signed-in can read" on public.rooms;
create policy "rooms: signed-in can read" on public.rooms
  for select to authenticated using (door <> 'support' and not private);

create index if not exists rooms_started_by on public.rooms (created_by, created_at) where custom;

-- active_at: the last time someone was seen in a room a person started. It ends 15 minutes after that.
alter table public.rooms add column if not exists active_at timestamptz;

-- People can read only what a room list needs: never who opened a room, or its voice room name.
revoke select on public.rooms from anon, authenticated;
grant select (id, door, mood, title, topic, capacity, status) on public.rooms to authenticated;

-- The Table: what was on the table goes with a report ------------------------------------------
-- Voice and chat aren't recorded, so a report about something on the table carries a short
-- description of it (and, for photos, the photo paths, so they're kept for the team to look at).
alter table public.reports add column if not exists evidence text;
alter table public.reports drop constraint if exists reports_evidence_check;
alter table public.reports add constraint reports_evidence_check check (evidence is null or char_length(evidence) <= 4000);

-- Adds evidence to the report you just sent from this room (within 10 minutes).
create or replace function public.add_report_evidence(p_room text, p_evidence text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  latest bigint;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  select id into latest from public.reports
  where reporter_id = uid and coalesce(room_id, '') = coalesce(p_room, '') and updated_at > now() - interval '10 minutes'
  order by updated_at desc
  limit 1;
  if latest is null then
    return;
  end if;
  update public.reports
  set evidence = left(concat_ws(E'\n---\n', evidence, nullif(trim(coalesce(p_evidence, '')), '')), 4000)
  where id = latest;
end;
$$;

revoke all on function public.add_report_evidence(text, text) from public, anon;
grant execute on function public.add_report_evidence(text, text) to authenticated;
