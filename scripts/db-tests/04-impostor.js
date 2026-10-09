// Find the Impostor: secret cards, honest votes, no early peeking, nothing kept.
module.exports = async ({ users, as, check, assert, db, fails }) => {
  const players = [users.ada, users.bayo, users.chi];
  await db.query(`insert into public.rooms (id, door, title, livekit_room_name) values
    ('play1', 'play', 'Let''s play', 'circles-play1') on conflict do nothing`);
  const start = (who, game = 'g1', list = players, room = 'play1') =>
    as(who, 'select * from public.start_impostor_round($1, $2, $3)', [room, game, list]);
  // Moves a round into its voting time (everyone has had their 30 seconds).
  const toVoting = (id) => db.query("update public.impostor_rounds set created_at = now() - interval '95 seconds' where id = $1", [id]);
  let round;

  await check('a round deals one impostor and the same word to everyone else', async () => {
    const r = await start(users.ada);
    round = r.rows[0].round_id;
    assert.strictEqual(r.rows[0].speaking_order.length, 3);
    const cards = [];
    for (const p of players) cards.push((await as(p, 'select public.my_impostor_card($1) as c', [round])).rows[0].c);
    assert.strictEqual(cards.filter((c) => c === '').length, 1);
    assert.strictEqual(new Set(cards.filter((c) => c !== '')).size, 1);
  });

  await check('never in a support room or any room that is not a play room', async () => {
    await db.query(`insert into public.rooms (id, door, title, livekit_room_name) values
      ('sup1', 'support', 'Someone to talk to', 'circles-sup1') on conflict do nothing`);
    await fails(start(users.ada, 'g2', players, 'sup1'), 'not_a_play_room');
    await fails(start(users.ada, 'g2', players, 'nowhere'), 'not_a_play_room');
  });

  await check('only players can see a card or start a round; nobody can read the tables', async () => {
    await fails(as(users.dami, 'select public.my_impostor_card($1)', [round]), 'not_a_player');
    await fails(start(users.dami), 'not_a_player');
    assert.strictEqual((await as(users.ada, 'select * from public.impostor_rounds')).rows.length, 0);
    assert.strictEqual((await as(users.ada, 'select * from public.impostor_votes')).rows.length, 0);
  });

  await check('needs 3 to 6 players', async () => {
    await fails(start(users.ada, 'g3', [users.ada, users.bayo]), 'needs_3_to_6_players');
  });

  await check('no voting while people are still describing', async () => {
    await fails(as(users.ada, 'select public.cast_impostor_vote($1, $2)', [round, users.bayo]), 'not_voting_yet');
  });

  await check('nobody learns who the impostor is before everyone has voted', async () => {
    await toVoting(round);
    const early = (await as(users.ada, 'select * from public.impostor_result($1)', [round])).rows;
    assert.strictEqual(early[0].ready, false);
    assert.strictEqual(early[0].impostor, null);
    const watcher = (await as(users.dami, 'select * from public.impostor_result($1)', [round])).rows;
    assert.strictEqual(watcher[0].impostor, null);
  });

  await check('you cannot vote for yourself or someone outside the game', async () => {
    await fails(as(users.ada, 'select public.cast_impostor_vote($1, $2)', [round, users.ada]), 'invalid_vote');
    await fails(as(users.ada, 'select public.cast_impostor_vote($1, $2)', [round, users.dami]), 'invalid_vote');
  });

  await check('after everyone votes: the impostor, the word and vote counts, never who voted for whom', async () => {
    await as(users.ada, 'select public.cast_impostor_vote($1, $2)', [round, users.bayo]);
    await as(users.bayo, 'select public.cast_impostor_vote($1, $2)', [round, users.chi]);
    await as(users.chi, 'select public.cast_impostor_vote($1, $2)', [round, users.bayo]);
    const rows = (await as(users.chi, 'select * from public.impostor_result($1)', [round])).rows;
    assert(rows.every((r) => r.ready === true));
    assert(players.includes(rows[0].impostor));
    const byTarget = Object.fromEntries(rows.map((r) => [r.target, Number(r.votes)]));
    assert.strictEqual(byTarget[users.bayo], 2);
    assert.strictEqual(byTarget[users.chi], 1);
    assert.strictEqual(rows[0].my_vote, users.bayo);
    assert(!Object.keys(rows[0]).includes('voter'));
  });

  await check('people watching see the reveal too, once it is out', async () => {
    const rows = (await as(users.dami, 'select * from public.impostor_result($1)', [round])).rows;
    assert.strictEqual(rows[0].ready, true);
  });

  await check('votes cannot change after the answer is out', async () => {
    await fails(as(users.ada, 'select public.cast_impostor_vote($1, $2)', [round, users.chi]), 'voting_closed');
  });

  await check('time running out also reveals, even if someone never voted', async () => {
    const id = (await start(users.ada, 'g4')).rows[0].round_id;
    await db.query("update public.impostor_rounds set created_at = now() - interval '10 minutes' where id = $1", [id]);
    assert.strictEqual((await as(users.ada, 'select * from public.impostor_result($1)', [id])).rows[0].ready, true);
  });

  await check('ending a game deletes its rounds and votes; old games are swept away', async () => {
    await as(users.bayo, 'select public.end_impostor_game($1)', ['g1']);
    assert.strictEqual((await db.query("select * from public.impostor_rounds where game_id = 'g1'")).rows.length, 0);
    assert.strictEqual((await db.query('select * from public.impostor_votes where round_id = $1', [round])).rows.length, 0);
    const old = (await start(users.ada, 'g5')).rows[0].round_id;
    await db.query("update public.impostor_rounds set created_at = now() - interval '3 hours' where id = $1", [old]);
    await start(users.ada, 'g6');
    assert.strictEqual((await db.query('select * from public.impostor_rounds where id = $1', [old])).rows.length, 0);
  });

  await check('someone outside a game cannot end it', async () => {
    const id = (await start(users.ada, 'g7')).rows[0].round_id;
    await as(users.dami, 'select public.end_impostor_game($1)', ['g7']);
    assert.strictEqual((await db.query('select * from public.impostor_rounds where id = $1', [id])).rows.length, 1);
  });
};
