-- Step 2b: safety basics. Reports, blocks and bans (Sammy removing someone).
-- Nobody can read reports or bans from the app. Sammy reads them in the Supabase dashboard.
-- Safe to run more than once.

-- Reports ---------------------------------------------------------------------------------------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid references auth.users (id) on delete set null,
  reported_nickname text,
  room_id text,
  reason text not null check (reason in
    ('danger', 'sexual', 'hate', 'threats', 'under18', 'scam', 'private_info', 'other', 'room')),
  details text check (details is null or char_length(details) <= 500),
  urgent boolean not null default false,
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reports enable row level security;
-- No policies on purpose: the app can't read or change reports, only add one through submit_report.

create index if not exists reports_open on public.reports (status, urgent desc, created_at desc);

-- Returns 'sent', or 'merged' when the same person was reported by the same reporter in the last 24 hours.
create or replace function public.submit_report(
  p_reported uuid,
  p_reported_name text,
  p_room text,
  p_reason text,
  p_details text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  earlier bigint;
  clean_details text := nullif(left(trim(coalesce(p_details, '')), 500), '');
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_reported = uid then
    raise exception 'cannot_report_self';
  end if;
  if p_reason is null or p_reason not in
    ('danger', 'sexual', 'hate', 'threats', 'under18', 'scam', 'private_info', 'other', 'room') then
    raise exception 'invalid_reason';
  end if;

  select id into earlier from public.reports
  where reporter_id = uid
    and reported_user_id is not distinct from p_reported
    and coalesce(room_id, '') = coalesce(p_room, '')
    and created_at > now() - interval '24 hours'
  order by created_at desc
  limit 1;

  if earlier is not null then
    update public.reports
    set details = concat_ws(E'\n---\n', public.reports.details, clean_details),
        urgent = public.reports.urgent or p_reason = 'danger',
        updated_at = now()
    where id = earlier;
    return 'merged';
  end if;

  insert into public.reports (reporter_id, reported_user_id, reported_nickname, room_id, reason, details, urgent)
  values (uid, p_reported, left(p_reported_name, 20), p_room, p_reason, clean_details, p_reason = 'danger');
  return 'sent';
end;
$$;

-- Blocks ----------------------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  blocked_nickname text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

-- You can see, add and remove only your own blocks. The blocked person is never told.
drop policy if exists "blocks: read own" on public.blocks;
drop policy if exists "blocks: add own" on public.blocks;
drop policy if exists "blocks: remove own" on public.blocks;
create policy "blocks: read own" on public.blocks for select to authenticated using (auth.uid() = blocker_id);
create policy "blocks: add own" on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
create policy "blocks: remove own" on public.blocks for delete to authenticated using (auth.uid() = blocker_id);

-- Bans (Sammy removes someone from the app) ------------------------------------------------------
create table if not exists public.bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null default 'Breaking the Circles rules',
  until timestamptz, -- empty means for good
  created_at timestamptz not null default now()
);

alter table public.bans enable row level security;
-- No policies: only Sammy (dashboard) and the server functions can see bans.

-- Lets the app show "Your account is paused" without exposing anyone else's ban.
create or replace function public.my_ban()
returns table (reason text, until timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select b.reason, b.until from public.bans b
  where b.user_id = auth.uid() and (b.until is null or b.until > now());
$$;

revoke all on function public.submit_report(uuid, text, text, text, text) from public, anon;
revoke all on function public.my_ban() from public, anon;
grant execute on function public.submit_report(uuid, text, text, text, text) to authenticated;
grant execute on function public.my_ban() to authenticated;
