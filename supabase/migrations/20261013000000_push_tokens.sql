-- Alerts on the lock screen (docs/BUILD_NOTES.md part 21): each phone's address for alerts (an Expo
-- push token), so the room server can send "Ada_K invited you to Ludo night". Nobody can read these
-- from the app, not even their own. Only for invitations for now, and never about a support room.
-- Safe to run more than once.

create table if not exists public.push_tokens (
  token text primary key check (char_length(token) <= 200),
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

-- This phone's address belongs to whoever is signed in on it now. A phone that changes hands moves
-- with the new account.
create or replace function public.save_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$' then
    raise exception 'bad_token';
  end if;
  insert into public.push_tokens (token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
  -- A handful of phones per account at most.
  delete from public.push_tokens
  where user_id = auth.uid()
    and token not in (select token from public.push_tokens where user_id = auth.uid() order by updated_at desc limit 5);
end;
$$;
revoke all on function public.save_push_token(text) from public, anon;
grant execute on function public.save_push_token(text) to authenticated;

-- Logging out: no more alerts for that account on this phone.
create or replace function public.forget_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke all on function public.forget_push_token(text) from public, anon;
grant execute on function public.forget_push_token(text) to authenticated;
