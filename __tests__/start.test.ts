import { readFileSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';
import { TOPICS, titleProblem } from '../src/rooms/start';

describe('starting a room', () => {
  it('checks titles like the room server does', () => {
    expect(titleProblem('Arsenal fans')).toBeNull();
    expect(titleProblem('Hi')).toBe('tooShort');
    expect(titleProblem('x'.repeat(41))).toBe('tooLong');
    expect(titleProblem('Call 0803 123 4567')).toBe('number');
    expect(titleProblem('see www.site.com')).toBe('link');
    expect(titleProblem('Circles Official')).toBe('reserved');
    expect(titleProblem('Need someone to talk to?')).toBe('reserved');
  });

  it('agrees with the room server on every name', () => {
    const server = readFileSync(join(__dirname, '..', 'supabase', 'functions', 'livekit-token', 'index.ts'), 'utf8');
    const block = server.slice(server.indexOf('// BEGIN MATCHING'), server.indexOf('// END MATCHING'));
    const js = ts.transpileModule(`${block}\nmodule.exports = { cleanTitle };`, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const mod: { exports: { cleanTitle?: (t: string) => string | null } } = { exports: {} };
    new Function('module', 'exports', js)(mod, mod.exports);
    const cases: [string, boolean][] = [
      ['Arsenal fans', true],
      ['Owambe 2026 plans', true],
      ['Arsenal supporters', true],
      ['Badminton chat', true],
      ['Ghost stories', true],
      ['C1rcles team', false],
      ['Circ les', false],
      ['Cìrcles', false],
      ['Сircles', false],
      ['Trained host room', false],
      ['Talk to a therapist', false],
      ['Support group tonight', false],
      ['Suicide talk', false],
      ['Admin room', false],
      ['0803/123/4567', false],
      ['0803_123_4567', false],
      ['０８０３１２３４５６７', false],
      ['call me @ 0803 123 4567', false],
    ];
    for (const [title, ok] of cases) {
      expect([title, titleProblem(title) === null]).toEqual([title, ok]);
      expect([title, mod.exports.cleanTitle?.(title) !== null]).toEqual([title, ok]);
    }
  });

  it('offers the same topics the room server accepts', () => {
    const server = readFileSync(join(__dirname, '..', 'supabase', 'functions', 'livekit-token', 'index.ts'), 'utf8');
    const list = server.match(/const TOPICS = \[([^\]]+)\]/)?.[1] ?? '';
    const serverTopics = list.split(',').map((t) => t.trim().replace(/'/g, ''));
    expect(TOPICS.map((t) => t.id)).toEqual(serverTopics);
  });
});
