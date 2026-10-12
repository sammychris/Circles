-- Log in with nickname and password (Sammy, 2026-10-11). The room server counts wrong passwords per
-- nickname: after 5 in a row, that nickname is locked for 15 minutes. Nobody can read this from the app.
-- Safe to run more than once.

create table if not exists public.login_failures (
  nickname text primary key check (char_length(nickname) <= 20),
  failures int not null default 0,
  locked_until timestamptz
);

alter table public.login_failures enable row level security;
revoke all on public.login_failures from anon, authenticated;
