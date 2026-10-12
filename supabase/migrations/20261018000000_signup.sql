-- Sign-up is a nickname and a password (Sammy, 2026-10-12). The age question moved out of sign-up:
-- it's asked inside the app the first time someone goes into a room, and the room server still lets
-- nobody talk without passing it (CLAUDE.md, Never list). Safe to run more than once.

-- Choosing a nickname no longer needs a date of birth first.
create or replace function public.set_nickname(new_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean text := trim(new_nickname);
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if clean is null or clean !~ '^[A-Za-z0-9_]{2,20}$' then
    raise exception 'invalid_nickname';
  end if;
  -- Long runs of digits could be a phone number. Never let one become a name.
  if clean ~ '[0-9]{7,}' then
    raise exception 'invalid_nickname';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  begin
    update public.profiles set nickname = clean where id = uid;
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
end;
$$;
revoke all on function public.set_nickname(text) from public, anon;
grant execute on function public.set_nickname(text) to authenticated;

-- New accounts per network address, so nobody can make hundreds of accounts in a row.
create table if not exists public.signup_attempts (
  id bigint generated always as identity primary key,
  ip text not null check (char_length(ip) <= 64),
  at timestamptz not null default now()
);
create index if not exists signup_attempts_ip on public.signup_attempts (ip, at desc);
alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;
