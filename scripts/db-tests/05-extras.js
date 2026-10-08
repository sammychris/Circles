// Open-test extras: reports outlive the reporter's account; rooms people start themselves.
module.exports = async ({ users, as, fails, check, assert, db }) => {
  await check('nicknames that pass for the Circles team are refused', async () => {
    await fails(as(users.dami, "select public.set_nickname('Circles_Team')"), 'reserved_nickname');
    await fails(as(users.dami, "select public.set_nickname('Admin')"), 'reserved_nickname');
    await as(users.dami, "select public.set_nickname('Modupe')");
  });

  await check('a report stays when the person who sent it deletes their account', async () => {
    const leaver = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [leaver]);
    await as(leaver, "select public.submit_report($1, 'Bayo', 'r9', 'threats', 'kept')", [users.bayo]);
    await db.query('delete from auth.users where id = $1', [leaver]);
    const kept = (await db.query("select * from public.reports where room_id = 'r9'")).rows;
    assert.strictEqual(kept.length, 1);
    assert.strictEqual(kept[0].reporter_id, null);
    assert.strictEqual(kept[0].reported_user_id, users.bayo);
  });

  await check('invite-only rooms and support rooms are never readable from the app', async () => {
    await db.query(
      "insert into public.rooms (id, kind, door, title, capacity, status, livekit_room_name, custom, private, topic) values ('p1', 'peer', 'talk', 'Friends only', 6, 'open', 'circles-p1', true, true, 'music'), ('o1', 'peer', 'talk', 'Arsenal fans', 6, 'open', 'circles-o1', true, false, 'football')",
    );
    const seen = (await as(users.ada, "select id from public.rooms where id in ('p1', 'o1')")).rows.map((r) => r.id);
    assert.deepStrictEqual(seen, ['o1']);
  });

  await check('people can never start a support room, and titles stay short', async () => {
    await fails(
      db.query("insert into public.rooms (id, kind, door, capacity, status, livekit_room_name, custom) values ('s9', 'hosted', 'support', 6, 'open', 'circles-s9', true)"),
      'rooms_custom_door_check',
    );
    await fails(
      db.query("insert into public.rooms (id, kind, door, title, capacity, status, livekit_room_name) values ('t9', 'peer', 'talk', $1, 6, 'open', 'circles-t9')", ['x'.repeat(41)]),
      'rooms_title_check',
    );
    await fails(as(users.ada, "insert into public.rooms (id, kind, door, capacity, status, livekit_room_name) values ('a9', 'peer', 'talk', 6, 'open', 'circles-a9')"), '');
  });
};
