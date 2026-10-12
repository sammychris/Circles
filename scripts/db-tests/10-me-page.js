// The Me page: your look, nickname changes, alerts and Report a problem (docs/me-page-spec.md).
module.exports = async ({ as, fails, check, assert, db }) => {
  const u = {};
  for (const name of ['ngozi', 'femi']) {
    u[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [u[name]]);
    await db.query('insert into public.profiles (id, nickname) values ($1, $2)', [u[name], name]);
  }

  await check('your look: a colour and a symbol from the list, seen by others, nothing else', async () => {
    await as(u.ngozi, "select public.update_my_profile('ngozi', 2::smallint, 'moon')");
    const seen = (await as(u.femi, 'select * from public.avatars_of($1)', [[u.ngozi]])).rows[0];
    assert.deepStrictEqual({ tint: seen.tint, symbol: seen.symbol }, { tint: 2, symbol: 'moon' });
    await fails(as(u.ngozi, "select public.update_my_profile('ngozi', 2::smallint, 'photo')"), 'profiles_avatar_symbol_check');
    await fails(as(u.ngozi, "select public.update_my_profile('ngozi', 9::smallint, null)"), 'profiles_avatar_tint_check');
  });

  await check('a new nickname: same rules, unique, and at most once a week', async () => {
    await fails(as(u.ngozi, "select public.update_my_profile('femi', null, null)"), 'nickname_taken');
    await fails(as(u.ngozi, "select public.update_my_profile('call 08012345678', null, null)"), 'invalid_nickname');
    await as(u.ngozi, "select public.update_my_profile('ngozi_k', null, null)");
    await fails(as(u.ngozi, "select public.update_my_profile('ngozi_x', null, null)"), 'too_soon');
    // Changing only the look is always fine.
    await as(u.ngozi, "select public.update_my_profile('ngozi_k', 1::smallint, null)");
  });

  await check('an old nickname is kept for the team, and nobody else can take it for 90 days', async () => {
    assert.strictEqual((await db.query("select count(*)::int as n from public.nickname_history where nickname = 'ngozi'")).rows[0].n, 1);
    assert.strictEqual((await as(u.femi, 'select * from public.nickname_history')).rows.length, 0);
    await db.query("update public.profiles set nickname_changed_at = null where id = $1", [u.femi]);
    await fails(as(u.femi, "select public.update_my_profile('ngozi', null, null)"), 'nickname_taken');
  });

  await check('a paused account can’t rename itself', async () => {
    await db.query("insert into public.bans (user_id, reason) values ($1, 'test')", [u.femi]).catch(async () => {
      await db.query('insert into public.bans (user_id) values ($1)', [u.femi]);
    });
    await fails(as(u.femi, "select public.update_my_profile('femi_new', null, null)"), 'paused');
  });

  await check('alerts: your own settings only', async () => {
    await as(u.femi, 'select public.set_notification_prefs(false, true)');
    assert.strictEqual((await as(u.femi, 'select invitations from public.notification_prefs')).rows[0].invitations, false);
    assert.strictEqual((await as(u.ngozi, 'select * from public.notification_prefs')).rows.length, 0);
  });

  await check('Report a problem: sent, never read back, a few a day', async () => {
    for (let i = 0; i < 5; i++) await as(u.femi, "select public.send_feedback('problem', 'The dice did not roll.')");
    await fails(as(u.femi, "select public.send_feedback('problem', 'Again.')"), 'too_many');
    assert.strictEqual((await as(u.femi, 'select * from public.feedback')).rows.length, 0);
  });
};
