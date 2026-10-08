// Invitations: only between people who saved each other, never from a support room, only the sender's
// nickname shown, and private rooms and groups open to the people invited.
module.exports = async ({ as, fails, check, assert, db }) => {
  const users = {};
  for (const name of ['ada', 'bayo', 'chi', 'dami']) {
    users[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [users[name]]);
    await db.query(
      'insert into public.profiles (id, nickname) values ($1, $2) on conflict (id) do update set nickname = excluded.nickname',
      [users[name], `Inv_${name}`],
    );
  }
  const save = (a, b) => db.query('insert into public.saves (saver_id, saved_id) values ($1, $2) on conflict do nothing', [a, b]);
  // Ada and Bayo saved each other; Ada saved Chi but Chi didn't save her back.
  await save(users.ada, users.bayo);
  await save(users.bayo, users.ada);
  await save(users.ada, users.chi);
  const send = (from, to, room, scheduled, group) =>
    db.query('select public.send_invitations($1, $2::uuid[], $3, $4, $5) as n', [from, to, room ?? null, scheduled ?? null, group ?? null]);
  const room = `inv-${Date.now()}`;
  const support = `inv-support-${Date.now()}`;
  await db.query(
    `insert into public.rooms (id, door, title, livekit_room_name, private) values ($1, 'play', 'Ludo with friends', $1, true), ($2, 'support', 'Quiet room', $2, false)`,
    [room, support],
  );

  await check('the app itself can neither read invitations nor send them', async () => {
    await fails(as(users.bayo, 'select * from public.invitations'), 'permission denied');
    await fails(
      as(users.ada, 'select public.send_invitations($1, array[$2]::uuid[], $3, null, null)', [users.ada, users.bayo, room]),
      'permission denied',
    );
  });

  await check('only people who saved each other get an invitation', async () => {
    const sent = (await send(users.ada, [users.bayo, users.chi, users.dami], room)).rows[0].n;
    assert.strictEqual(sent, 1);
    const bayo = (await as(users.bayo, 'select * from public.my_invitations()')).rows;
    assert.strictEqual(bayo.length, 1);
    assert.strictEqual(bayo[0].from_nickname, 'Inv_ada');
    assert.strictEqual(bayo[0].title, 'Ludo with friends');
    assert.strictEqual(bayo[0].kind, 'room');
    assert.strictEqual((await as(users.chi, 'select * from public.my_invitations()')).rows.length, 0);
    // Sending again doesn't make a second one.
    assert.strictEqual((await send(users.ada, [users.bayo], room)).rows[0].n, 0);
  });

  await check('never from a support room', async () => {
    await fails(send(users.ada, [users.bayo], support), 'ended');
  });

  await check('Not now hides it, and only for the person invited', async () => {
    const id = (await as(users.bayo, 'select id from public.my_invitations()')).rows[0].id;
    await as(users.chi, 'select public.dismiss_invitation($1)', [id]);
    assert.strictEqual((await as(users.bayo, 'select * from public.my_invitations()')).rows.length, 1);
    await as(users.bayo, 'select public.dismiss_invitation($1)', [id]);
    assert.strictEqual((await as(users.bayo, 'select * from public.my_invitations()')).rows.length, 0);
  });

  await check('a new invitation to the same room comes through after Not now', async () => {
    assert.strictEqual((await send(users.ada, [users.bayo], room)).rows[0].n, 1);
    assert.strictEqual((await as(users.bayo, 'select * from public.my_invitations() where room_id = $1', [room])).rows.length, 1);
  });

  await check('running the scheduled rooms file again keeps invitations working', async () => {
    const fs = require('fs');
    const path = require('path');
    await db.exec(fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261011000000_scheduled_rooms.sql'), 'utf8'));
    const g = (
      await db.query(
        "insert into public.groups (name, door, days, start_time, time_zone, private, created_by) values ('Rerun club', 'talk', '{1}', '19:00', 'UTC', true, $1) returning id",
        [users.ada],
      )
    ).rows[0].id;
    await send(users.ada, [users.bayo], null, null, g);
    assert.strictEqual((await as(users.bayo, 'select id from public.list_groups() where id = $1', [g])).rows.length, 1);
  });

  await check('a closed room takes its invitations with it', async () => {
    const other = `inv-other-${Date.now()}`;
    await db.query(`insert into public.rooms (id, door, title, livekit_room_name) values ($1, 'talk', 'Chat', $1)`, [other]);
    await send(users.bayo, [users.ada], other);
    assert.strictEqual((await as(users.ada, 'select * from public.my_invitations()')).rows.length, 1);
    await db.query(`update public.rooms set status = 'closed' where id = $1`, [other]);
    assert.strictEqual((await as(users.ada, 'select * from public.my_invitations()')).rows.length, 0);
  });

  await check('an invitation opens a private group and its meetings, and can be joined', async () => {
    const g = (
      await db.query(
        "insert into public.groups (name, door, days, start_time, time_zone, private, created_by) values ('Friends Ludo', 'play', '{0,1,2,3,4,5,6}', '23:59', 'UTC', true, $1) returning id",
        [users.ada],
      )
    ).rows[0].id;
    await as(users.ada, 'select * from public.list_groups()');
    assert.strictEqual((await as(users.bayo, 'select id from public.list_groups() where id = $1', [g])).rows.length, 0);
    await fails(as(users.bayo, 'select public.join_group($1)', [g]), 'not_found');
    await send(users.ada, [users.bayo], null, null, g);
    const inv = (await as(users.bayo, 'select * from public.my_invitations() where group_id = $1', [g])).rows;
    assert.strictEqual(inv.length, 1);
    assert.strictEqual(inv[0].title, 'Friends Ludo');
    assert.strictEqual((await as(users.bayo, 'select id from public.list_groups() where id = $1', [g])).rows.length, 1);
    const meetings = (await as(users.bayo, "select id from public.upcoming_rooms(now() + interval '8 days') where group_id = $1", [g]))
      .rows;
    assert(meetings.length > 0, 'the meetings are visible too');
    await as(users.bayo, 'select public.join_group($1)', [g]);
    // Joined: the invitation has done its job.
    assert.strictEqual((await as(users.bayo, 'select * from public.my_invitations() where group_id = $1', [g])).rows.length, 0);
    // Someone who wasn't invited still can't see it.
    assert.strictEqual((await as(users.dami, 'select id from public.list_groups() where id = $1', [g])).rows.length, 0);
  });

  await check('blocking hides invitations both ways', async () => {
    const other = `inv-block-${Date.now()}`;
    await db.query(`insert into public.rooms (id, door, title, livekit_room_name) values ($1, 'talk', 'Chat', $1)`, [other]);
    await send(users.ada, [users.bayo], other);
    assert.strictEqual((await as(users.bayo, 'select * from public.my_invitations() where room_id = $1', [other])).rows.length, 1);
    await as(users.bayo, "insert into public.blocks (blocker_id, blocked_id, blocked_nickname) values ($1, $2, 'Inv_ada')", [
      users.bayo,
      users.ada,
    ]);
    assert.strictEqual((await as(users.bayo, 'select * from public.my_invitations() where room_id = $1', [other])).rows.length, 0);
    // And the saves are gone, so no new ones either.
    assert.strictEqual((await send(users.ada, [users.bayo], other)).rows[0].n, 0);
  });

  await check('at most 20 people in one go', async () => {
    await fails(send(users.chi, Array(21).fill(users.dami), `x`), 'too_many');
  });
};
