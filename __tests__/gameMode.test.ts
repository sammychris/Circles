import { diffBoards } from '../src/games/mode/motion';
import { HOW_TO_PLAY } from '../src/games/mode/howToPlay';
import { BASE, cellOf, hopPath } from '../src/games/ludo/engine';
import { pieceSide } from '../src/games/draughts/engine';

jest.mock('../src/lib/sounds', () => ({ playSound: jest.fn() }));
jest.mock('../src/lib/buzz', () => ({ buzz: { light: jest.fn(), medium: jest.fn(), success: jest.fn() } }));

const empty = (): (string | null)[] => Array(64).fill(null);

describe('working out a move for the movement on screen', () => {
  it('finds a piece that moved', () => {
    const before = empty();
    before[42] = 'u';
    const after = empty();
    after[33] = 'u';
    expect(diffBoards(before, after, pieceSide)).toEqual({ slides: [{ from: 42, to: 33, was: 'u' }], captured: [] });
  });

  it('finds a capture, and a new king', () => {
    const before = empty();
    before[17] = 'u';
    before[10] = 'k';
    const after = empty();
    after[3] = 'U';
    const found = diffBoards(before, after, pieceSide);
    expect(found?.slides).toEqual([{ from: 17, to: 3, was: 'u' }]);
    expect(found?.captured).toEqual([{ at: 10, code: 'k' }]);
  });

  it('pairs both pieces when castling', () => {
    const side = (c: string) => (c[0] === 'w' ? 'sun' : 'sky');
    const before = empty();
    before[60] = 'wk';
    before[63] = 'wr';
    const after = empty();
    after[62] = 'wk';
    after[61] = 'wr';
    expect(diffBoards(before, after, side)?.slides).toEqual([
      { from: 63, to: 61, was: 'wr' },
      { from: 60, to: 62, was: 'wk' },
    ]);
  });

  it("doesn't animate a whole new game", () => {
    const before = empty();
    const after = empty();
    for (let i = 0; i < 12; i++) after[i] = 'k';
    expect(diffBoards(before, after, pieceSide)).toBeNull();
  });
});

describe('Ludo hops', () => {
  it('hops square by square', () => {
    expect(hopPath('sun', 0, 3, 6)).toEqual([cellOf('sun', 0, 4), cellOf('sun', 0, 5), cellOf('sun', 0, 6)]);
  });

  it('comes out of base onto the start square', () => {
    expect(hopPath('sky', 2, BASE, 0)).toEqual([cellOf('sky', 2, 0)]);
  });

  it('just appears back in base when sent home', () => {
    expect(hopPath('sun', 1, 20, BASE)).toEqual([]);
  });
});

describe('How to play', () => {
  it('explains every game in 3 to 6 short lines', () => {
    for (const lines of Object.values(HOW_TO_PLAY)) {
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(6);
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(140);
    }
  });
});
