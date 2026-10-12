-- Joining a weekly group needs the 18+ answer, now that sign-up no longer asks it (Sammy, 2026-10-12).
-- The same function as before with one check added. Safe to run more than once.
create or replace function public.join_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  -- Locked, so two people joining at once can't take the group past its size.
  select * into g from public.groups where id = p_group and ended_at is null for update;
  if g.id is null
     or public.is_banned(g.created_by)
     or (g.private and g.created_by <> auth.uid() and not public.invited_to(auth.uid(), null, g.id))
     or exists (
       select 1 from public.blocks b
       where (b.blocker_id = auth.uid() and b.blocked_id = g.created_by)
          or (b.blocker_id = g.created_by and b.blocked_id = auth.uid())
     ) then
    raise exception 'not_found';
  end if;
  if exists (select 1 from public.group_members where group_id = p_group and user_id = auth.uid()) then
    return;
  end if;
  -- Groups meet in voice rooms with strangers: 18+ (the age is asked before the first room).
  if not exists (
    select 1 from public.birth_dates b
    where b.id = auth.uid() and b.date_of_birth <= (current_date - interval '18 years')::date
  ) then
    raise exception 'adults_only';
  end if;
  if (select count(*) from public.group_members where group_id = p_group) >= g.capacity then
    raise exception 'group_full';
  end if;
  insert into public.group_members (group_id, user_id) values (p_group, auth.uid());
end;
$$;
revoke all on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;
