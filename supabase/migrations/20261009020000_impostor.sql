-- Find the Impostor (docs/design/pages/play.md). The server deals the cards so nobody's phone can
-- peek: everyone but one person gets the same Naija word; the impostor gets nothing.
-- Votes count only for the game. Nobody is ever removed or muted by a vote (CLAUDE.md, Never list).
-- No scores are kept: a round only stores what it needs to be played, and old rounds are deleted.
-- Safe to run more than once.

create table if not exists public.impostor_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  word text not null,
  impostor uuid not null,
  players uuid[] not null,
  speaking_order uuid[] not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.impostor_votes (
  round_id uuid not null references public.impostor_rounds (id) on delete cascade,
  voter uuid not null,
  target uuid not null,
  primary key (round_id, voter)
);

alter table public.impostor_rounds enable row level security;
alter table public.impostor_votes enable row level security;
-- No policies: the cards and votes are only reachable through the functions below.

-- How long each person gets to describe the word, and how long voting can last, in seconds.
-- The app uses the same numbers (src/games/impostor/logic.ts).
create or replace function public.impostor_timing()
returns table (speak_seconds int, vote_seconds int)
language sql
immutable
as $$ select 30, 60 $$;

-- Starts a round: picks a word and an impostor at random, and a speaking order.
create or replace function public.start_impostor_round(p_room text, p_players uuid[])
returns table (round_id uuid, speaking_order uuid[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  players uuid[];
  words text[] := array[
    'Suya', 'Danfo', 'NEPA', 'Jollof', 'Okada', 'Agbada', 'Puff-puff', 'Keke', 'Garri', 'Ankara',
    'Owambe', 'Pepper soup', 'Akara', 'Moi moi', 'Chin chin', 'Zobo', 'Egusi', 'Plantain', 'Generator',
    'Aso ebi', 'Bole', 'Kunu', 'Gele', 'Tokunbo', 'BRT', 'Mama put', 'Shawarma', 'Agege bread', 'Fanta',
    'Nollywood', 'Molue', 'Eba', 'Ofada rice', 'Kilishi', 'Tiger nuts'
  ];
  chosen_order uuid[];
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  select array_agg(distinct p) into players from unnest(p_players) p;
  if players is null or not (uid = any (players)) then
    raise exception 'not_a_player';
  end if;
  if array_length(players, 1) < 3 or array_length(players, 1) > 6 then
    raise exception 'needs_3_to_6_players';
  end if;

  select array_agg(p order by random()) into chosen_order from unnest(players) p;

  insert into public.impostor_rounds (room_id, word, impostor, players, speaking_order, created_by)
  values (
    p_room,
    words[1 + floor(random() * array_length(words, 1))::int],
    players[1 + floor(random() * array_length(players, 1))::int],
    players,
    chosen_order,
    uid
  )
  returning id into new_id;

  -- Rounds are only needed while they're played. Clear anything older than a day.
  delete from public.impostor_rounds where created_at < now() - interval '1 day';

  return query select new_id, chosen_order;
end;
$$;

-- Your own card: the word, or an empty string when you're the impostor. Only for players.
create or replace function public.my_impostor_card(p_round uuid)
returns text
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  r public.impostor_rounds;
begin
  select * into r from public.impostor_rounds where id = p_round;
  if r.id is null or not (auth.uid() = any (r.players)) then
    raise exception 'not_a_player';
  end if;
  return case when r.impostor = auth.uid() then '' else r.word end;
end;
$$;

create or replace function public.cast_impostor_vote(p_round uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.impostor_rounds;
begin
  select * into r from public.impostor_rounds where id = p_round;
  if r.id is null or not (auth.uid() = any (r.players)) then
    raise exception 'not_a_player';
  end if;
  if not (p_target = any (r.players)) or p_target = auth.uid() then
    raise exception 'invalid_vote';
  end if;
  insert into public.impostor_votes (round_id, voter, target)
  values (p_round, auth.uid(), p_target)
  on conflict (round_id, voter) do update set target = excluded.target;
end;
$$;

-- The reveal. Only once everyone has voted, or speaking and voting time are over, so nobody can
-- find out early. Says how many votes each person got, never who voted for whom.
create or replace function public.impostor_result(p_round uuid)
returns table (ready boolean, impostor uuid, word text, target uuid, votes bigint, my_vote uuid)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  r public.impostor_rounds;
  t record;
  voted int;
  over_at timestamptz;
begin
  select * into r from public.impostor_rounds where id = p_round;
  if r.id is null or not (auth.uid() = any (r.players)) then
    raise exception 'not_a_player';
  end if;
  select * into t from public.impostor_timing();
  select count(*) into voted from public.impostor_votes v where v.round_id = p_round;
  over_at := r.created_at + make_interval(secs => t.speak_seconds * array_length(r.players, 1) + t.vote_seconds);

  if voted < array_length(r.players, 1) and now() < over_at then
    return query select false, null::uuid, null::text, null::uuid, 0::bigint,
      (select v.target from public.impostor_votes v where v.round_id = p_round and v.voter = auth.uid());
    return;
  end if;

  return query
    select true, r.impostor, r.word, p.player, count(v.voter),
      (select v2.target from public.impostor_votes v2 where v2.round_id = p_round and v2.voter = auth.uid())
    from unnest(r.players) as p(player)
    left join public.impostor_votes v on v.round_id = p_round and v.target = p.player
    group by p.player;
end;
$$;

revoke all on function public.start_impostor_round(text, uuid[]) from public, anon;
revoke all on function public.my_impostor_card(uuid) from public, anon;
revoke all on function public.cast_impostor_vote(uuid, uuid) from public, anon;
revoke all on function public.impostor_result(uuid) from public, anon;
grant execute on function public.start_impostor_round(text, uuid[]) to authenticated;
grant execute on function public.my_impostor_card(uuid) to authenticated;
grant execute on function public.cast_impostor_vote(uuid, uuid) to authenticated;
grant execute on function public.impostor_result(uuid) to authenticated;
grant execute on function public.impostor_timing() to authenticated;
