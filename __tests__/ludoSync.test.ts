import { apply, newGame, type LudoState } from '../src/games/ludo/engine';
import { absentPlayers, preferGame, receiveAction } from '../src/games/ludo/sync';

const g = (id: string): LudoState => newGame(['a', 'b', 'c', 'd'], 'a', () => 0.99, id);

describe('agreeing on one game', () => {
  it('two people tapping Play Ludo at once end up on the same game, whatever order the messages arrive', () => {
    const one = g('m1');
    const two = g('m2');
    expect(preferGame(preferGame(null, one), two).id).toBe('m1');
    expect(preferGame(preferGame(null, two), one).id).toBe('m1');
  });

  it('a newer move count of the same game wins', () => {
    const start = g('x');
    const later = apply(start, { type: 'roll', by: 'a', value: 6, seq: 0 });
    expect(preferGame(start, later)).toBe(later);
    expect(preferGame(later, start)).toBe(later);
  });

  it('a running game beats an old finished one', () => {
    const old = { ...g('a-old'), winner: 'sun' as const };
    const running = g('z-new');
    expect(preferGame(old, running).id).toBe('z-new');
    expect(preferGame(running, old).id).toBe('z-new');
  });
});

describe('receiving moves', () => {
  it('ignores moves for another game', () => {
    const s = g('x');
    expect(receiveAction(s, 'other', { type: 'roll', by: 'a', value: 6, seq: 0 }).state).toBe(s);
  });

  it('asks for the game again after missing a move', () => {
    const s = g('x');
    expect(receiveAction(s, 'x', { type: 'roll', by: 'a', value: 6, seq: 3 }).resync).toBe(true);
  });

  it('applies a normal move', () => {
    const r = receiveAction(g('x'), 'x', { type: 'roll', by: 'a', value: 6, seq: 0 });
    expect(r.state?.dice).toBe(6);
  });
});

describe('people who left the room', () => {
  it('finds team members who are gone', () => {
    expect(absentPlayers(g('x'), ['a', 'c'])).toEqual(['b', 'd']);
  });
});
