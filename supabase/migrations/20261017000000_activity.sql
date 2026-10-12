-- The bell on Home (Activity): "You and Ada are now friends". Only ever a friendship both people made,
-- with when it began; never who saved whom (CLAUDE.md, Never list). Safe to run more than once.
create or replace function public.my_new_friends(p_since timestamptz)
returns table (person_id uuid, nickname text, since timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select mine.saved_id, coalesce(p.nickname, mine.saved_nickname), greatest(mine.created_at, theirs.created_at)
  from public.saves mine
  join public.saves theirs on theirs.saver_id = mine.saved_id and theirs.saved_id = mine.saver_id
  left join public.profiles p on p.id = mine.saved_id
  where mine.saver_id = auth.uid() and greatest(mine.created_at, theirs.created_at) > p_since
  order by 3 desc
  limit 50;
$$;
revoke all on function public.my_new_friends(timestamptz) from public, anon;
grant execute on function public.my_new_friends(timestamptz) to authenticated;
