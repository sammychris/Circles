-- Step 1: the two small tables the test room needs. Row Level Security is on for both.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Only the owner can read or change their own profile.
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.rooms (
  id text primary key,
  kind text not null default 'peer' check (kind in ('peer', 'hosted')),
  mood_or_topic text,
  host_id uuid references auth.users (id),
  capacity int not null default 6 check (capacity between 3 and 12),
  status text not null default 'open' check (status in ('open', 'closing', 'closed')),
  scheduled_at timestamptz,
  livekit_room_name text not null
);

alter table public.rooms enable row level security;

-- Signed-in people can see rooms. Nobody can change them from the app.
drop policy if exists "rooms: signed-in can read" on public.rooms;
create policy "rooms: signed-in can read" on public.rooms
  for select to authenticated using (true);

insert into public.rooms (id, kind, mood_or_topic, capacity, status, livekit_room_name)
values ('test-room', 'peer', 'Step 1 voice test', 6, 'open', 'circles-test-room')
on conflict (id) do nothing;
