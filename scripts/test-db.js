// Runs every Supabase migration on a throwaway in-memory Postgres and checks the safety rules.
// Run with: npm run test:db
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { PGlite } = require('@electric-sql/pglite');

const MIGRATIONS = path.join(__dirname, '..', 'supabase', 'migrations');

// Just enough of Supabase for the migrations: an auth schema, auth.uid(), and the two app roles.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean default true);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (e) {
    console.error(`FAILED: ${name}\n  ${e.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);

  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  // Every migration must run cleanly, and again a second time (they are pasted by hand).
  for (const round of [1, 2]) {
    for (const file of files) {
      try {
        await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), 'utf8'));
      } catch (e) {
        console.error(`FAILED: ${file} (run ${round})\n  ${e.message}`);
        process.exit(1);
      }
    }
  }
  passed += 1;

  const users = {};
  for (const name of ['ada', 'bayo', 'chi', 'kid', 'dami']) {
    users[name] = (await db.query('select gen_random_uuid() as id')).rows[0].id;
    await db.query('insert into auth.users (id) values ($1)', [users[name]]);
  }

  // Run a query as a signed-in person, with Row Level Security on.
  async function as(user, sql, params = []) {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${user}';`);
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec(`reset role; set request.jwt.claim.sub = '';`);
    }
  }
  async function fails(promise, text) {
    let error = null;
    try {
      await promise;
    } catch (e) {
      error = e;
    }
    assert(error, `expected an error containing "${text}"`);
    assert(error.message.includes(text), `expected "${text}", got "${error.message}"`);
  }

  const ctx = { db, users, as, fails, check, assert };
  for (const file of fs.readdirSync(path.join(__dirname, 'db-tests')).sort()) {
    await require(path.join(__dirname, 'db-tests', file))(ctx);
  }

  if (!process.exitCode) console.log(`Database checks passed: ${passed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
