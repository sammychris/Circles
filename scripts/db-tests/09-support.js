// Support: becoming a host, host cards, one-on-one (CIRCLES_INTENT.md › Support).
module.exports = async ({ as, fails, check, assert, db }) => {
  const u = {};
  for (const name of ['lola', 'kemi', 'tobi', 'yemi', 'teen']) {
    u[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [u[name]]);
    await db.query('insert into public.profiles (id, nickname) values ($1, $2)', [u[name], name]);
    const dob = name === 'teen' ? "current_date - interval '16 years'" : "date '1990-01-01'";
    await db.query(`insert into public.birth_dates (id, date_of_birth) values ($1, ${dob})`, [u[name]]);
  }
  const apply = (who, kind, extra = {}) =>
    as(
      who,
      `select public.submit_host_application($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) as id`,
      [
        kind,
        'I have been through it and I am here to listen.',
        ['loneliness', 'stress'],
        ['English', 'Igbo'],
        'I want to help people feel less alone.',
        extra.fullName ?? null,
        extra.credential ?? null,
        extra.body ?? null,
        extra.licence ?? null,
        extra.trained ?? true,
        extra.agreed ?? true,
      ],
    );

  await check('applying needs training, the agreement and 18+, once at a time', async () => {
    await fails(apply(u.lola, 'listener', { trained: false }), 'training_needed');
    await fails(apply(u.lola, 'listener', { agreed: false }), 'agreement_needed');
    await fails(apply(u.teen, 'listener'), 'adults_only');
    await apply(u.lola, 'listener');
    await fails(apply(u.lola, 'listener'), 'already_pending');
    // Professionals must give their real details.
    await fails(apply(u.kemi, 'professional'), 'host_applications_professional');
    await apply(u.kemi, 'professional', { fullName: 'Dr Kemi Adeyemi', credential: 'Clinical psychologist', body: 'MDCN', licence: 'MD-12345' });
  });

  await check('applicants see only their own application, and can’t approve themselves', async () => {
    assert.strictEqual((await as(u.tobi, 'select * from public.host_applications')).rows.length, 0);
    assert.strictEqual((await as(u.lola, 'select * from public.host_applications')).rows.length, 1);
    const r = await as(u.lola, `update public.host_applications set status = 'approved' returning id`);
    assert.strictEqual(r.rows.length, 0);
    assert.strictEqual((await as(u.lola, 'select public.my_host_status() as s')).rows[0].s.isHost, false);
  });

  await check('approving (by the team) makes a host with a card', async () => {
    await db.query(`update public.host_applications set status = 'approved' where user_id in ($1, $2)`, [u.lola, u.kemi]);
    const s = (await as(u.lola, 'select public.my_host_status() as s')).rows[0].s;
    assert.strictEqual(s.isHost, true);
    assert.strictEqual(s.profile.kind, 'listener');
    const card = (await as(u.tobi, 'select * from public.host_card($1)', [u.kemi])).rows[0];
    assert.strictEqual(card.full_name, 'Dr Kemi Adeyemi');
    // A listener's card never carries a real name.
    assert.strictEqual((await as(u.tobi, 'select * from public.host_card($1)', [u.lola])).rows[0].full_name, null);
  });

  await check('trained listeners are always free', async () => {
    await fails(as(u.lola, 'select public.update_my_host_profile($1, $2, $3, true, 30, 5000, false)', ['Hi', ['stress'], ['English']]), 'listeners_free');
    await as(u.lola, 'select public.update_my_host_profile($1, $2, $3, true, 30, 0, false)', ['Hi', ['stress'], ['English']]);
  });

  await check('a listener is only offered for one-on-one after hosting 5 support rooms', async () => {
    await as(u.lola, 'select public.set_host_online(true)');
    assert.strictEqual((await as(u.tobi, 'select * from public.list_one_on_one_hosts()')).rows.length, 0);
    await fails(as(u.tobi, 'select public.request_one_on_one($1)', [u.lola]), 'not_available');
    // The room server writes one row per room and day once a room reaches 3 people.
    for (let i = 0; i < 4; i++) await db.query('insert into public.support_host_sessions (host_id, room_id) values ($1, $2)', [u.lola, `sup-${i}`]);
    await fails(as(u.lola, "insert into public.support_host_sessions (host_id, room_id) values ($1, 'x')", [u.lola]), 'row-level security');
    assert.strictEqual((await as(u.tobi, 'select * from public.list_one_on_one_hosts()')).rows.length, 0);
    await db.query("insert into public.support_host_sessions (host_id, room_id) values ($1, 'sup-4')", [u.lola]);
    const listed = (await as(u.tobi, 'select * from public.list_one_on_one_hosts()')).rows.map((r) => r.nickname);
    assert.deepStrictEqual(listed, ['lola']);
    // Never to yourself, and not to someone you blocked.
    assert.strictEqual((await as(u.lola, 'select * from public.list_one_on_one_hosts()')).rows.length, 0);
    await as(u.yemi, 'insert into public.blocks (blocker_id, blocked_id) values ($1, $2)', [u.yemi, u.lola]);
    assert.strictEqual((await as(u.yemi, 'select * from public.list_one_on_one_hosts()')).rows.length, 0);
    await fails(as(u.yemi, 'select public.request_one_on_one($1)', [u.lola]), 'not_available');
  });

  let reqId;
  await check('asking, and the host saying yes, opens a private room for two', async () => {
    reqId = (await as(u.tobi, 'select public.request_one_on_one($1) as id', [u.lola])).rows[0].id;
    await fails(as(u.tobi, 'select public.request_one_on_one($1)', [u.lola]), 'already_waiting');
    const inbox = (await as(u.lola, 'select * from public.host_requests()')).rows;
    assert.deepStrictEqual(inbox.map((r) => r.nickname), ['tobi']);
    // Nobody else can answer it, or see it.
    await fails(as(u.kemi, 'select public.respond_one_on_one($1, true)', [reqId]), 'not_waiting');
    assert.strictEqual((await as(u.yemi, 'select * from public.my_one_on_one($1)', [reqId])).rows.length, 0);
    const room = (await as(u.lola, 'select public.respond_one_on_one($1, true) as r', [reqId])).rows[0].r;
    const mine = (await as(u.tobi, 'select * from public.my_one_on_one($1)', [reqId])).rows[0];
    assert.strictEqual(mine.status, 'accepted');
    assert.strictEqual(mine.room_id, room);
    const row = (await db.query('select kind, capacity, private, door from public.rooms where id = $1', [room])).rows[0];
    assert.deepStrictEqual(row, { kind: 'one_on_one', capacity: 2, private: true, door: 'support' });
    // The room is never visible from the app.
    assert.strictEqual((await as(u.tobi, 'select id from public.rooms where id = $1', [room])).rows.length, 0);
  });

  await check('a request nobody answers runs out after 10 minutes', async () => {
    const id = (await as(u.yemi, 'select gen_random_uuid() as id')).rows[0].id;
    await db.query(`insert into public.one_on_one_requests (id, user_id, host_id, minutes, created_at)
      values ($1, $2, $3, 30, now() - interval '11 minutes')`, [id, u.yemi, u.kemi]);
    assert.strictEqual((await as(u.yemi, 'select * from public.my_one_on_one($1)', [id])).rows[0].status, 'expired');
  });

  await check('paid sessions wait for payments; a free first session is free', async () => {
    await as(u.kemi, 'select public.update_my_host_profile($1, $2, $3, true, 30, 15000, false)', ['Hi', ['grief'], ['English']]);
    await as(u.kemi, 'select public.set_host_online(true)');
    await fails(as(u.tobi, 'select public.request_one_on_one($1)', [u.kemi]), 'payment_needed');
    await as(u.kemi, 'select public.update_my_host_profile($1, $2, $3, true, 30, 15000, true)', ['Hi', ['grief'], ['English']]);
    const id = (await as(u.tobi, 'select public.request_one_on_one($1) as id', [u.kemi])).rows[0].id;
    assert.strictEqual((await db.query('select price_naira from public.one_on_one_requests where id = $1', [id])).rows[0].price_naira, 0);
  });

  await check('rating: once, only by the person who asked', async () => {
    await as(u.lola, 'select public.rate_one_on_one($1, 5, true)', [reqId]);
    await as(u.tobi, 'select public.rate_one_on_one($1, 4, true)', [reqId]);
    await as(u.tobi, 'select public.rate_one_on_one($1, 1, false)', [reqId]);
    assert.strictEqual((await db.query('select rating from public.one_on_one_requests where id = $1', [reqId])).rows[0].rating, 4);
  });

  await check('an upheld report takes one-on-one away', async () => {
    await db.query(`insert into public.reports (reporter_id, reported_user_id, reason, status) values ($1, $2, 'other', 'actioned')`, [u.yemi, u.lola]);
    assert.strictEqual((await as(u.tobi, 'select * from public.list_one_on_one_hosts()')).rows.some((r) => r.nickname === 'lola'), false);
  });

  await check('notify-me and the other tables can’t be read from the app', async () => {
    await as(u.tobi, 'select public.support_notify_me()');
    for (const t of ['support_notify', 'one_on_one_requests', 'host_profiles']) {
      assert.strictEqual((await as(u.tobi, `select * from public.${t}`)).rows.length, 0, t);
    }
    await fails(as(u.tobi, 'select public.one_on_one_trusted($1)', [u.lola]), 'permission denied');
  });
};
