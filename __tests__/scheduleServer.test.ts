import { readFileSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

// The scheduling rules exactly as they are in the Supabase function.
const source = readFileSync(join(__dirname, '..', 'supabase', 'functions', 'livekit-token', 'index.ts'), 'utf8');
const block = source.slice(source.indexOf('// BEGIN MATCHING'), source.indexOf('// END MATCHING'));
const js = ts.transpileModule(`${block}\nmodule.exports = { cleanWhen, goInWindow };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod: { exports: Record<string, unknown> } = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const cleanWhen = mod.exports.cleanWhen as (body: Record<string, unknown>, now?: number) => unknown;
const goInWindow = mod.exports.goInWindow as (startsAt: string, now?: number) => string;

const NOW = Date.UTC(2026, 9, 8, 18, 0);
const MIN = 60_000;

describe('scheduling a room', () => {
  it('takes a time from 5 minutes to 7 days ahead', () => {
    expect(cleanWhen({ startsAt: new Date(NOW + 60 * MIN).toISOString() }, NOW)).toEqual({
      kind: 'once',
      startsAt: new Date(NOW + 60 * MIN).toISOString(),
    });
    expect(cleanWhen({ startsAt: new Date(NOW + 2 * MIN).toISOString() }, NOW)).toBeNull();
    expect(cleanWhen({ startsAt: new Date(NOW + 8 * 24 * 60 * MIN).toISOString() }, NOW)).toBeNull();
    expect(cleanWhen({ startsAt: 'tomorrow' }, NOW)).toBeNull();
  });

  it('takes weekly days and a time, in a real time zone', () => {
    expect(cleanWhen({ weekly: { days: [5, 2, 2], time: '19:30', timeZone: 'Africa/Lagos' } }, NOW)).toEqual({
      kind: 'weekly',
      days: [2, 5],
      time: '19:30',
      timeZone: 'Africa/Lagos',
    });
    expect(cleanWhen({ weekly: { days: [], time: '19:30' } }, NOW)).toBeNull();
    expect(cleanWhen({ weekly: { days: [7], time: '19:30' } }, NOW)).toBeNull();
    expect(cleanWhen({ weekly: { days: [1], time: '25:00' } }, NOW)).toBeNull();
    expect(cleanWhen({ weekly: { days: [1], time: '19:00', timeZone: 'Not/AZone' } }, NOW)).toBeNull();
    // Offsets and odd spellings aren't region names Postgres is sure to know: Lagos time instead.
    expect(cleanWhen({ weekly: { days: [1], time: '19:00', timeZone: '+01:00' } }, NOW)).toMatchObject({ timeZone: 'Africa/Lagos' });
    expect(cleanWhen({ weekly: { days: [1], time: '19:00', timeZone: 'africa/lagos' } }, NOW)).toMatchObject({ timeZone: 'Africa/Lagos' });
  });
});

describe('going in', () => {
  const at = new Date(NOW).toISOString();
  it('opens 5 minutes before and closes 2 hours after', () => {
    expect(goInWindow(at, NOW - 6 * MIN)).toBe('not_yet');
    expect(goInWindow(at, NOW - 5 * MIN)).toBe('open');
    expect(goInWindow(at, NOW + 119 * MIN)).toBe('open');
    expect(goInWindow(at, NOW + 121 * MIN)).toBe('ended');
  });
});
