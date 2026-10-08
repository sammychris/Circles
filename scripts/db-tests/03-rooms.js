// Steps 3 to 5: rooms, saves, thank-yous, hosts.
module.exports = async ({ users, as, check, assert, db, fails }) => {
  await check('support rooms are never visible to people', async () => {
    await db.query(`insert into public.rooms (id, door, title, livekit_room_name) values
      ('s1', 'support', 'Someone to talk to', 'circles-s1'), ('t1', 'talk', 'Just chat', 'circles-t1')`);
    const visible = (await as(users.ada, 'select id from public.rooms')).rows.map((r) => r.id);
    assert(visible.includes('t1'));
    assert(!visible.includes('s1'));
  });

  await check('people cannot create or change rooms', async () => {
    await fails(as(users.ada, `insert into public.rooms (id, livekit_room_name) values ('x', 'x')`), 'row-level security');
    const r = await as(users.ada, `update public.rooms set status = 'closed' returning id`);
    assert.strictEqual(r.rows.length, 0);
  });

  await check('saves only connect when both save, and stay private', async () => {
    await as(users.ada, 'insert into public.saves (saver_id, saved_id, saved_nickname) values ($1, $2, $3)', [users.ada, users.bayo, 'Bayo']);
    assert.strictEqual((await as(users.ada, 'select * from public.my_connections()')).rows.length, 0);
    assert.strictEqual((await as(users.bayo, 'select * from public.saves')).rows.length, 0, 'Bayo must not see that Ada saved him');
    await as(users.bayo, 'insert into public.saves (saver_id, saved_id, saved_nickname) values ($1, $2, $3)', [users.bayo, users.ada, 'Ada_K']);
    const ada = (await as(users.ada, 'select * from public.my_connections()')).rows;
    const bayo = (await as(users.bayo, 'select * from public.my_connections()')).rows;
    assert.deepStrictEqual(ada.map((r) => r.nickname), ['Bayo']);
    assert.deepStrictEqual(bayo.map((r) => r.nickname), ['Ada_K']);
    assert.strictEqual((await as(users.chi, 'select * from public.my_connections()')).rows.length, 0);
  });

  await check('thank-yous: a count for the receiver, never who', async () => {
    await as(users.ada, 'insert into public.thanks (from_id, to_id, room_id) values ($1, $2, $3)', [users.ada, users.chi, 't1']);
    const count = (await as(users.chi, 'select public.my_thanks_count() as n')).rows[0].n;
    assert.strictEqual(Number(count), 1);
    assert.strictEqual((await as(users.chi, 'select * from public.thanks')).rows.length, 0);
  });

  await check('hosts are set by Sammy only', async () => {
    assert.strictEqual((await as(users.ada, 'select public.am_i_host() as h')).rows[0].h, false);
    await db.query('insert into public.hosts (user_id) values ($1)', [users.chi]);
    assert.strictEqual((await as(users.chi, 'select public.am_i_host() as h')).rows[0].h, true);
    await fails(as(users.ada, 'insert into public.hosts (user_id) values ($1)', [users.ada]), 'row-level security');
    assert.strictEqual((await as(users.ada, 'select * from public.hosts')).rows.length, 0);
  });
};
