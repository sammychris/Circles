import { DAY_SECONDS, NIGHT_SECONDS, mafia, type MafiaGame } from '../src/games/mafia/engine';

const game = (): MafiaGame => {
  const g = mafia.setup(['n', 'a', 'b', 'c', 'd'], 'n', () => 0.3, { n: 'Narrator', a: 'Ada', b: 'Bayo', c: 'Chi', d: 'Dami' });
  // Fixed roles for the tests.
  return { ...g, roles: { a: 'mafia', b: 'doctor', c: 'detective', d: 'town' }, players: ['a', 'b', 'c', 'd'], endsAt: 1000 + NIGHT_SECONDS * 1000 };
};

describe('mafia', () => {
  it('deals roles to everyone but the narrator, and never shows them until the end', () => {
    const g = mafia.setup(['n', 'a', 'b', 'c', 'd'], 'n', () => 0.3, {});
    expect(g.players).not.toContain('n');
    expect(Object.values(g.roles).sort()).toEqual(['detective', 'doctor', 'mafia', 'town']);
    expect((mafia.publicView(g) as { roles: unknown }).roles).toBeNull();
    expect((mafia.secretFor!(g, 'n') as { role: string }).role).toBe('narrator');
  });

  it('night: the Doctor can save the Mafia target, and morning comes when all have chosen', () => {
    let g = game();
    expect(mafia.apply(g, { type: 'night', target: 'b' }, 'd', 1000)).toBeNull();
    g = mafia.apply(g, { type: 'night', target: 'd' }, 'a', 1000)!;
    g = mafia.apply(g, { type: 'night', target: 'd' }, 'b', 1000)!;
    g = mafia.apply(g, { type: 'night', target: 'a' }, 'c', 1000)!;
    expect(g.phase).toBe('day');
    expect(g.out).toEqual([]);
    expect(g.checks).toEqual([{ target: 'a', mafia: true }]);
    expect((mafia.secretFor!(g, 'c') as { checks: unknown[] }).checks).toHaveLength(1);
    expect((mafia.secretFor!(g, 'b') as { checks: unknown[] }).checks).toHaveLength(0);
  });

  it('day: votes are counted, never shown by name, and voting the Mafia out wins for the town', () => {
    let g: MafiaGame = { ...game(), phase: 'day', endsAt: 1000 + DAY_SECONDS * 1000 };
    g = mafia.apply(g, { type: 'vote', target: 'a' }, 'b', 1000)!;
    const pub = mafia.publicView(g) as { voted: number };
    // Only how many have voted, never the running counts or who.
    expect(pub.voted).toBe(1);
    expect(pub).not.toHaveProperty('tally');
    expect(JSON.stringify(pub)).not.toContain('"b":"a"');
    g = mafia.apply(g, { type: 'vote', target: 'a' }, 'c', 1000)!;
    g = mafia.apply(g, { type: 'vote', target: 'skip' }, 'd', 1000)!;
    g = mafia.apply(g, { type: 'vote', target: 'b' }, 'a', 1000)!;
    expect(g.out).toEqual(['a']);
    expect(g.winner).toBe('town');
    expect((mafia.publicView(g) as { roles: unknown }).roles).not.toBeNull();
  });

  it('out players can no longer vote, and the night ends by itself after 20 seconds', () => {
    let g: MafiaGame = { ...game(), out: ['d'] };
    expect(mafia.apply(g, { type: 'night', target: 'b' }, 'd', 1000)).toBeNull();
    expect(mafia.tick!(g, 2000, [])).toBeNull();
    g = mafia.tick!(g, 1000 + NIGHT_SECONDS * 1000, [])!;
    expect(g.phase).toBe('day');
  });

  it('the Mafia wins when it matches the town', () => {
    let g: MafiaGame = { ...game(), out: ['b', 'c'] };
    g = mafia.apply(g, { type: 'night', target: 'd' }, 'a', 1000)!;
    expect(g.winner).toBe('mafia');
  });

  it('tells each Mafia who their partner is, and nobody else', () => {
    const g: MafiaGame = { ...game(), roles: { a: 'mafia', b: 'mafia', c: 'detective', d: 'town' } };
    expect((mafia.secretFor!(g, 'a') as { partners: string[] }).partners).toEqual(['b']);
    expect((mafia.secretFor!(g, 'd') as { partners: string[] }).partners).toEqual([]);
  });
});
