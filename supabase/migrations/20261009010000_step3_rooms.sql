-- Steps 3 to 5: many rooms, each behind a door, filled by the server (the voice function).
-- Rooms are created and chosen by the server only. People can read open rooms, never change them.
-- Safe to run more than once.

alter table public.rooms add column if not exists door text not null default 'talk';
alter table public.rooms add column if not exists mood text;
alter table public.rooms add column if not exists title text;
alter table public.rooms add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.rooms add column if not exists created_at timestamptz not null default now();

alter table public.rooms drop constraint if exists rooms_door_check;
alter table public.rooms add constraint rooms_door_check check (door in ('talk', 'play', 'support'));
alter table public.rooms drop constraint if exists rooms_mood_check;
alter table public.rooms add constraint rooms_mood_check check (mood is null or mood in ('chat', 'laugh', 'advice'));

update public.rooms set title = 'Just chat', door = 'talk' where id = 'test-room' and title is null;

-- Support rooms are never listed or counted for anyone (CLAUDE.md, Never list). Only the server sees them.
drop policy if exists "rooms: signed-in can read" on public.rooms;
create policy "rooms: signed-in can read" on public.rooms
  for select to authenticated using (door <> 'support');

create index if not exists rooms_open_by_door on public.rooms (door, status, mood);

-- Saves: secret. You only connect when both of you save each other, and only you two see it. -------
create table if not exists public.saves (
  saver_id uuid not null references auth.users (id) on delete cascade,
  saved_id uuid not null references auth.users (id) on delete cascade,
  saved_nickname text,
  created_at timestamptz not null default now(),
  primary key (saver_id, saved_id),
  check (saver_id <> saved_id)
);

alter table public.saves enable row level security;
drop policy if exists "saves: read own" on public.saves;
drop policy if exists "saves: add own" on public.saves;
drop policy if exists "saves: remove own" on public.saves;
create policy "saves: read own" on public.saves for select to authenticated using (auth.uid() = saver_id);
create policy "saves: add own" on public.saves for insert to authenticated with check (auth.uid() = saver_id);
create policy "saves: remove own" on public.saves for delete to authenticated using (auth.uid() = saver_id);

-- The people you've connected with: you saved them and they saved you. Never says who saved first.
create or replace function public.my_connections()
returns table (person_id uuid, nickname text)
language sql
security definer
set search_path = ''
stable
as $$
  select mine.saved_id, mine.saved_nickname
  from public.saves mine
  join public.saves theirs on theirs.saver_id = mine.saved_id and theirs.saved_id = mine.saver_id
  where mine.saver_id = auth.uid();
$$;

-- Blocking someone removes any save between you, both ways. Nobody is told.
create or replace function public.remove_saves_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.saves
  where (saver_id = new.blocker_id and saved_id = new.blocked_id)
     or (saver_id = new.blocked_id and saved_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists blocks_remove_saves on public.blocks;
create trigger blocks_remove_saves after insert on public.blocks
  for each row execute function public.remove_saves_on_block();

-- Thank-yous: a private, kind signal. Nobody sees who thanked whom. ----------------------------------
create table if not exists public.thanks (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  room_id text not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, room_id),
  check (from_id <> to_id)
);

alter table public.thanks enable row level security;
drop policy if exists "thanks: add own" on public.thanks;
drop policy if exists "thanks: read own sent" on public.thanks;
drop policy if exists "thanks: remove own" on public.thanks;
create policy "thanks: add own" on public.thanks for insert to authenticated with check (auth.uid() = from_id);
create policy "thanks: read own sent" on public.thanks for select to authenticated using (auth.uid() = from_id);
create policy "thanks: remove own" on public.thanks for delete to authenticated using (auth.uid() = from_id);

-- How many thank-yous you've received (a number only, never who).
create or replace function public.my_thanks_count()
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select count(*) from public.thanks where to_id = auth.uid();
$$;

-- Hosts: people Sammy trusts to look after support rooms. Sammy adds them in the dashboard. -------
create table if not exists public.hosts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.hosts enable row level security;
-- No policies: only Sammy and the server see who is a host.

create or replace function public.am_i_host()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (select 1 from public.hosts where user_id = auth.uid());
$$;

revoke all on function public.my_connections() from public, anon;
revoke all on function public.my_thanks_count() from public, anon;
revoke all on function public.am_i_host() from public, anon;
grant execute on function public.my_connections() to authenticated;
grant execute on function public.my_thanks_count() to authenticated;
grant execute on function public.am_i_host() to authenticated;
