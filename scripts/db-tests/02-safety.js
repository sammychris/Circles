// Step 2b: reports, blocks, bans.
module.exports = async ({ users, as, fails, check, assert, db }) => {
  await check('a report is accepted and an earlier one within 24 hours is merged', async () => {
    const first = await as(users.ada, "select public.submit_report($1, 'Bayo', 'r1', 'hate', 'rude') as r", [users.bayo]);
    assert.strictEqual(first.rows[0].r, 'sent');
    const again = await as(users.ada, "select public.submit_report($1, 'Bayo', 'r1', 'danger', 'worse') as r", [users.bayo]);
    assert.strictEqual(again.rows[0].r, 'merged');
    const row = (await db.query('select * from public.reports')).rows;
    assert.strictEqual(row.length, 1);
    assert.strictEqual(row[0].urgent, true);
    assert(row[0].details.includes('rude') && row[0].details.includes('worse'));
  });

  await check('bad report reasons and self-reports are refused', async () => {
    await fails(as(users.ada, "select public.submit_report($1, 'Bayo', 'r1', 'boring', null)", [users.bayo]), 'invalid_reason');
    await fails(as(users.ada, "select public.submit_report($1, 'Ada', 'r1', 'hate', null)", [users.ada]), 'cannot_report_self');
  });

  await check('nobody can read reports from the app', async () => {
    const r = await as(users.ada, 'select * from public.reports');
    assert.strictEqual(r.rows.length, 0);
  });

  await check('blocks are private to the blocker', async () => {
    await as(users.ada, 'insert into public.blocks (blocker_id, blocked_id, blocked_nickname) values ($1, $2, $3)', [users.ada, users.chi, 'Chi']);
    assert.strictEqual((await as(users.ada, 'select * from public.blocks')).rows.length, 1);
    assert.strictEqual((await as(users.chi, 'select * from public.blocks')).rows.length, 0);
    await fails(as(users.bayo, 'insert into public.blocks (blocker_id, blocked_id) values ($1, $2)', [users.chi, users.bayo]), '');
  });

  await check('bans: only your own, only while active', async () => {
    await db.query("insert into public.bans (user_id, reason) values ($1, 'Hate or harassment')", [users.dami]);
    assert.strictEqual((await as(users.dami, 'select * from public.my_ban()')).rows.length, 1);
    assert.strictEqual((await as(users.ada, 'select * from public.my_ban()')).rows.length, 0);
    assert.strictEqual((await as(users.ada, 'select * from public.bans')).rows.length, 0);
    await db.query("update public.bans set until = now() - interval '1 day' where user_id = $1", [users.dami]);
    assert.strictEqual((await as(users.dami, 'select * from public.my_ban()')).rows.length, 0);
    await db.query('delete from public.bans');
  });
};
