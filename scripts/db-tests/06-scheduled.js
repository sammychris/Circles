// Scheduled rooms, weekly groups and reminders: only counts are ever shown, never who; private ones
// stay private; support rooms can never be scheduled.
module.exports = async ({ users: older, as, fails, check, assert, db }) => {
  // Fresh people, so blocks made by earlier checks don't get in the way.
  const users = {};
  for (const name of ['ada', 'bayo', 'chi', 'dami']) {
    users[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [users[name]]);
  }
  void older;
  const soon = "now() + interval '3 hours'";
  const insertRoom = (id, by, extra = '') =>
    db.query(
      `insert into public.scheduled_rooms (id, door, title, starts_at, created_by${extra ? ', private' : ''}) values ($1, 'play', 'Ludo night', ${soon}, $2${extra ? ', true' : ''})`,
      [id, by],
    );
  const ids = {};
  for (const name of ['pub', 'priv', 'blocked']) ids[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;

  await check('support rooms can never be scheduled', async () => {
    await fails(
      db.query(`insert into public.scheduled_rooms (door, title, starts_at, created_by) values ('support', 'Quiet room', ${soon}, $1)`, [
        users.ada,
      ]),
      'scheduled_rooms_door_check',
    );
    await fails(
      db.query("insert into public.groups (name, door, days, start_time, created_by) values ('Quiet', 'support', '{1}', '19:00', $1)", [
        users.ada,
      ]),
      'groups_door_check',
    );
  });

  await check('the tables themselves are closed to the app', async () => {
    await insertRoom(ids.pub, users.ada);
    await fails(as(users.bayo, 'select * from public.scheduled_rooms'), 'permission denied');
    await fails(as(users.bayo, 'select * from public.groups'), 'permission denied');
    await fails(
      as(users.bayo, 'insert into public.reminders (user_id, scheduled_id) values ($1, $2)', [users.bayo, ids.pub]),
      'permission denied',
    );
  });

  await check('public scheduled rooms are listed with a count of who is going, never who', async () => {
    await as(users.bayo, 'select public.set_reminder($1, true)', [ids.pub]);
    await as(users.chi, 'select public.set_reminder($1, true)', [ids.pub]);
    const row = (await as(users.dami, "select * from public.upcoming_rooms(now() + interval '1 day') where id = $1", [ids.pub])).rows[0];
    assert.strictEqual(row.going, 2);
    assert.strictEqual(row.reminded, false);
    assert.strictEqual(row.host_nickname !== undefined, true);
    // Your own reminders only.
    assert.strictEqual((await as(users.bayo, 'select * from public.reminders')).rows.length, 1);
    assert.strictEqual((await as(users.dami, 'select * from public.reminders')).rows.length, 0);
    await as(users.chi, 'select public.set_reminder($1, false)', [ids.pub]);
    const after = (await as(users.dami, "select going from public.upcoming_rooms(now() + interval '1 day') where id = $1", [ids.pub]))
      .rows[0];
    assert.strictEqual(after.going, 1);
  });

  await check('private scheduled rooms are only seen by the person who made them', async () => {
    await insertRoom(ids.priv, users.ada, 'private');
    const mine = (await as(users.ada, "select id from public.upcoming_rooms(now() + interval '1 day') where id = $1", [ids.priv])).rows;
    const theirs = (await as(users.bayo, "select id from public.upcoming_rooms(now() + interval '1 day') where id = $1", [ids.priv])).rows;
    assert.strictEqual(mine.length, 1);
    assert.strictEqual(theirs.length, 0);
    await fails(as(users.bayo, 'select public.set_reminder($1, true)', [ids.priv]), 'not_found');
  });

  await check("rooms made by someone you blocked don't show up", async () => {
    await insertRoom(ids.blocked, users.dami);
    await as(users.chi, "insert into public.blocks (blocker_id, blocked_id, blocked_nickname) values ($1, $2, 'Dami')", [
      users.chi,
      users.dami,
    ]);
    const seen = (await as(users.chi, "select id from public.upcoming_rooms(now() + interval '1 day') where id = $1", [ids.blocked])).rows;
    assert.strictEqual(seen.length, 0);
    // The other way round too.
    const back = (await as(users.dami, "select id from public.upcoming_rooms(now() + interval '1 day') where id = $1", [ids.pub])).rows;
    assert.strictEqual(back.length, 1);
  });

  await check('weekly groups make their meetings a week ahead, and count regulars', async () => {
    const g = (
      await db.query(
        "insert into public.groups (name, door, days, start_time, time_zone, capacity, created_by) values ('Igbo practice', 'learn', '{0,1,2,3,4,5,6}', '23:59', 'UTC', 2, $1) returning id",
        [users.ada],
      )
    ).rows[0].id;
    const listed = (await as(users.bayo, 'select * from public.list_groups() where id = $1', [g])).rows[0];
    assert.strictEqual(listed.regulars, 0);
    assert(listed.next_starts_at, 'the next meeting is made');
    const meetings = (await db.query('select count(*)::int as n from public.scheduled_rooms where group_id = $1', [g])).rows[0].n;
    assert(meetings >= 7 && meetings <= 9, `about a week of meetings, got ${meetings}`);
    await as(users.bayo, 'select public.join_group($1)', [g]);
    await as(users.chi, 'select public.join_group($1)', [g]);
    await fails(as(users.dami, 'select public.join_group($1)', [g]), 'group_full');
    const again = (await as(users.bayo, 'select regulars, regular from public.list_groups() where id = $1', [g])).rows[0];
    assert.deepStrictEqual([again.regulars, again.regular], [2, true]);
    // A regular counts as going to each meeting.
    const next = (
      await as(users.dami, "select going from public.upcoming_rooms(now() + interval '8 days') where group_id = $1 limit 1", [g])
    ).rows[0];
    assert.strictEqual(next.going, 2);
    await as(users.chi, 'select public.leave_group($1)', [g]);
    assert.strictEqual((await as(users.bayo, 'select regulars from public.list_groups() where id = $1', [g])).rows[0].regulars, 1);
  });

  await check('only the person who made a group can end it, and its meetings go too', async () => {
    const g = (
      await db.query(
        "insert into public.groups (name, door, days, start_time, time_zone, created_by) values ('Ludo club', 'play', '{0,1,2,3,4,5,6}', '23:59', 'UTC', $1) returning id",
        [users.ada],
      )
    ).rows[0].id;
    await as(users.bayo, 'select * from public.list_groups()');
    await as(users.bayo, 'select public.end_group($1)', [g]);
    assert.strictEqual((await as(users.bayo, 'select * from public.list_groups() where id = $1', [g])).rows.length, 1);
    await as(users.ada, 'select public.end_group($1)', [g]);
    assert.strictEqual((await as(users.bayo, 'select * from public.list_groups() where id = $1', [g])).rows.length, 0);
    const left = (await as(users.bayo, "select * from public.upcoming_rooms(now() + interval '8 days') where group_id = $1", [g])).rows;
    assert.strictEqual(left.length, 0);
  });

  await check("a removed person's rooms and groups stop showing, and nobody can join their group", async () => {
    const host = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [host]);
    const room = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await insertRoom(room, host);
    const g = (
      await db.query(
        "insert into public.groups (name, door, days, start_time, time_zone, created_by) values ('Removed club', 'talk', '{0,1,2,3,4,5,6}', '23:59', 'UTC', $1) returning id",
        [host],
      )
    ).rows[0].id;
    await db.query("insert into public.bans (user_id, reason) values ($1, 'test')", [host]);
    assert.strictEqual(
      (await as(users.bayo, "select id from public.upcoming_rooms(now() + interval '1 day') where id = $1", [room])).rows.length,
      0,
    );
    assert.strictEqual((await as(users.bayo, 'select id from public.list_groups() where id = $1', [g])).rows.length, 0);
    await fails(as(users.bayo, 'select public.join_group($1)', [g]), 'not_found');
    assert.strictEqual((await db.query('select count(*)::int as n from public.scheduled_rooms where group_id = $1', [g])).rows[0].n, 0);
  });

  await check('a new group never gets a meeting from before it was made', async () => {
    const g = (
      await db.query(
        "insert into public.groups (name, door, days, start_time, time_zone, created_by) values ('Late start', 'talk', '{0,1,2,3,4,5,6}', (now() at time zone 'UTC' - interval '1 hour')::time, 'UTC', $1) returning id",
        [users.bayo],
      )
    ).rows[0].id;
    await as(users.bayo, 'select * from public.list_groups()');
    const first = (await db.query('select min(starts_at) > now() as later from public.scheduled_rooms where group_id = $1', [g])).rows[0];
    assert.strictEqual(first.later, true);
  });

  await check("a group with a time zone Postgres doesn't know doesn't break the lists", async () => {
    await db.query(
      "insert into public.groups (name, door, days, start_time, time_zone, created_by) values ('Odd zone', 'talk', '{1}', '19:00', 'Not/AZone', $1)",
      [users.bayo],
    );
    await as(users.dami, 'select * from public.list_groups()');
    await as(users.dami, "select * from public.upcoming_rooms(now() + interval '1 day')");
  });

  await check('deleting an account takes its reminders and group places with it', async () => {
    const leaver = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [leaver]);
    await as(leaver, 'select public.set_reminder($1, true)', [ids.pub]);
    await db.query('delete from auth.users where id = $1', [leaver]);
    assert.strictEqual((await db.query('select count(*)::int as n from public.reminders where user_id = $1', [leaver])).rows[0].n, 0);
  });
};
