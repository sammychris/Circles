-- Step 2: real login. The nickname lives in profiles (others will see it from Step 3). The date of birth
-- lives in its own private table, readable only by its owner, used only for the 18+ check and never shown.
-- The app can only write through the two functions below, so the rules (18+, nickname format, unique
-- nickname, birth date set once) can't be skipped. Safe to run more than once.

alter table public.profiles alter column nickname drop not null;

create table if not exists public.birth_dates (
  id uuid primary key references auth.users (id) on delete cascade,
  date_of_birth date not null,
  created_at timestamptz not null default now()
);

alter table public.birth_dates enable row level security;

drop policy if exists "birth_dates: read own" on public.birth_dates;
create policy "birth_dates: read own" on public.birth_dates
  for select to authenticated using (auth.uid() = id);

-- Step 1 test profiles had no date of birth. Clear them so those people go through the 18+ question.
-- (Everyone else gets a birth date before a profile, so this only ever touches Step 1 leftovers.)
delete from public.profiles p
where not exists (select 1 from public.birth_dates b where b.id = p.id);

alter table public.profiles drop constraint if exists profiles_nickname_check;
alter table public.profiles drop constraint if exists profiles_nickname_format;
alter table public.profiles add constraint profiles_nickname_format
  check (nickname is null or nickname ~ '^[A-Za-z0-9_]{2,20}$');

create unique index if not exists profiles_nickname_unique on public.profiles (lower(nickname));

-- Reading your own profile stays allowed. Writing only happens through the functions below.
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create or replace function public.set_date_of_birth(dob date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if dob is null or dob > current_date or dob < date '1900-01-01' then
    raise exception 'invalid_date';
  end if;

  -- Set once, ever. "do nothing" means a second try (even at the same moment) can't overwrite the first.
  insert into public.birth_dates (id, date_of_birth)
  values (uid, dob)
  on conflict (id) do nothing;
  if not found then
    raise exception 'already_set';
  end if;

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

  return dob <= (current_date - interval '18 years')::date;
end;
$$;

create or replace function public.set_nickname(new_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  dob date;
  clean text := trim(new_nickname);
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;

  select date_of_birth into dob from public.birth_dates where id = uid;
  if dob is null or dob > (current_date - interval '18 years')::date then
    raise exception 'not_adult';
  end if;

  if clean is null or clean !~ '^[A-Za-z0-9_]{2,20}$' then
    raise exception 'invalid_nickname';
  end if;
  -- Long runs of digits could be a phone number. Never let one become a name.
  if clean ~ '[0-9]{7,}' then
    raise exception 'invalid_nickname';
  end if;

  begin
    update public.profiles set nickname = clean where id = uid;
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
end;
$$;

revoke all on function public.set_date_of_birth(date) from public, anon;
revoke all on function public.set_nickname(text) from public, anon;
grant execute on function public.set_date_of_birth(date) to authenticated;
grant execute on function public.set_nickname(text) to authenticated;
