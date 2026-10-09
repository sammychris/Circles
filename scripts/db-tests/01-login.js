// Step 2: 18+ question, nickname rules, date of birth privacy.
module.exports = async ({ users, as, fails, check, assert }) => {
  await check('an adult can set a date of birth once', async () => {
    const r = await as(users.ada, "select public.set_date_of_birth('1995-03-05') as adult");
    assert.strictEqual(r.rows[0].adult, true);
    await fails(as(users.ada, "select public.set_date_of_birth('1990-01-01')"), 'already_set');
  });

  await check('under 18 is recorded as not adult and cannot pick a nickname', async () => {
    const r = await as(users.kid, "select public.set_date_of_birth('2012-01-01') as adult");
    assert.strictEqual(r.rows[0].adult, false);
    await fails(as(users.kid, "select public.set_nickname('KidName')"), 'not_adult');
  });

  await check('nickname rules', async () => {
    await as(users.bayo, "select public.set_date_of_birth('1990-06-01')");
    await as(users.chi, "select public.set_date_of_birth('1988-02-02')");
    await as(users.dami, "select public.set_date_of_birth('1992-02-02')");
    await fails(as(users.bayo, "select public.set_nickname('Ada K')"), 'invalid_nickname');
    await fails(as(users.bayo, "select public.set_nickname('call08031234567')"), 'invalid_nickname');
    await as(users.ada, "select public.set_nickname('Ada_K')");
    await fails(as(users.bayo, "select public.set_nickname('ada_k')"), 'nickname_taken');
    await as(users.bayo, "select public.set_nickname('Bayo')");
    await as(users.chi, "select public.set_nickname('Chi')");
    await as(users.dami, "select public.set_nickname('Dami')");
  });

  await check('people can read only their own date of birth and profile', async () => {
    const mine = await as(users.ada, 'select * from public.birth_dates');
    assert.strictEqual(mine.rows.length, 1);
    const profiles = await as(users.ada, 'select * from public.profiles');
    assert.strictEqual(profiles.rows.length, 1);
  });

  await check('nobody can write profiles or dates of birth directly', async () => {
    const changed = await as(users.ada, `update public.birth_dates set date_of_birth = '2015-01-01' returning id`);
    assert.strictEqual(changed.rows.length, 0);
    const r = await as(users.ada, `update public.profiles set nickname = 'Hacker' returning id`);
    assert.strictEqual(r.rows.length, 0);
    await fails(as(users.ada, `insert into public.birth_dates (id, date_of_birth) values ('${users.kid}', '1990-01-01')`), 'row-level security');
  });
};
