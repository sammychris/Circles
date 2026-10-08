// Alert addresses (push tokens): nobody reads them from the app, and a phone moves with whoever signs in.
module.exports = async ({ as, fails, check, assert, db }) => {
  const users = {};
  for (const name of ['ada', 'bayo']) {
    users[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [users[name]]);
  }
  const token = 'ExponentPushToken[abcdefghij1234567890]';

  await check('alert addresses are saved through the function only, and never read back', async () => {
    await as(users.ada, 'select public.save_push_token($1)', [token]);
    await fails(as(users.ada, 'select * from public.push_tokens'), 'permission denied');
    await fails(as(users.ada, "insert into public.push_tokens (token, user_id) values ('x', $1)", [users.ada]), 'permission denied');
    await fails(as(users.ada, "select public.save_push_token('not a token')"), 'bad_token');
  });

  await check('a phone that changes hands moves to the new account', async () => {
    await as(users.bayo, 'select public.save_push_token($1)', [token]);
    const owner = (await db.query('select user_id from public.push_tokens where token = $1', [token])).rows[0].user_id;
    assert.strictEqual(owner, users.bayo);
  });

  await check('at most 5 phones per account, and none after the account is deleted', async () => {
    for (let i = 0; i < 7; i++) await as(users.ada, 'select public.save_push_token($1)', [`ExpoPushToken[phone${i}abcdefghij]`]);
    assert.strictEqual((await db.query('select count(*)::int as n from public.push_tokens where user_id = $1', [users.ada])).rows[0].n, 5);
    // Not signed in: not allowed at all.
    await db.exec('set role anon');
    try {
      await fails(db.query("select public.save_push_token('ExpoPushToken[abcdefghijkl]')"), 'permission denied');
    } finally {
      await db.exec('reset role');
    }
    const gone = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [gone]);
    await as(gone, 'select public.save_push_token($1)', ['ExpoPushToken[leavingsoon12345]']);
    await db.query('delete from auth.users where id = $1', [gone]);
    assert.strictEqual((await db.query('select count(*)::int as n from public.push_tokens where user_id = $1', [gone])).rows[0].n, 0);
  });

  await check('logging out forgets it, and only your own', async () => {
    await as(users.ada, 'select public.forget_push_token($1)', [token]);
    assert.strictEqual((await db.query('select count(*)::int as n from public.push_tokens where token = $1', [token])).rows[0].n, 1);
    await as(users.bayo, 'select public.forget_push_token($1)', [token]);
    assert.strictEqual((await db.query('select count(*)::int as n from public.push_tokens where token = $1', [token])).rows[0].n, 0);
  });
};
