// The bell: new friendships only, never a one-sided save.
module.exports = async ({ as, check, assert, db }) => {
  const u = {};
  for (const name of ['ada', 'obi', 'eze']) {
    u[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [u[name]]);
    await db.query('insert into public.profiles (id, nickname) values ($1, $2)', [u[name], `${name}_a`]);
  }
  await check('the bell shows a friendship both made, never a one-sided save', async () => {
    await as(u.ada, 'insert into public.saves (saver_id, saved_id) values ($1, $2)', [u.ada, u.obi]);
    const since = "now() - interval '1 day'";
    assert.strictEqual((await as(u.obi, `select * from public.my_new_friends(${since})`)).rows.length, 0, 'Obi must not learn Ada saved him');
    await as(u.obi, 'insert into public.saves (saver_id, saved_id) values ($1, $2)', [u.obi, u.ada]);
    assert.deepStrictEqual((await as(u.obi, `select nickname from public.my_new_friends(${since})`)).rows.map((r) => r.nickname), ['ada_a']);
    assert.deepStrictEqual((await as(u.ada, `select nickname from public.my_new_friends(${since})`)).rows.map((r) => r.nickname), ['obi_a']);
    assert.strictEqual((await as(u.eze, `select * from public.my_new_friends(${since})`)).rows.length, 0);
    assert.strictEqual((await as(u.obi, "select * from public.my_new_friends(now() + interval '1 minute')")).rows.length, 0);
  });
};
