import {
  BASE,
  FINISH,
  HOME_COLUMN,
  TRACK_CELLS,
  apply,
  cellOf,
  movableTokens,
  newGame,
  trackSquare,
  type LudoAction,
  type LudoState,
} from '../src/games/ludo/engine';

const players = ['a', 'b', 'c', 'd'];
const fixed = () => 0.99; // keeps the order: sun = [a, b], sky = [c, d]

function game(): LudoState {
  return newGame(players, 'a', fixed);
}

type Step = LudoAction extends infer A ? (A extends LudoAction ? Omit<A, 'seq'> : never) : never;

function run(state: LudoState, ...steps: Step[]): LudoState {
  return steps.reduce((s, step) => apply(s, { ...step, seq: s.seq } as LudoAction), state);
}

describe('the board', () => {
  it('has 52 different track squares', () => {
    expect(TRACK_CELLS).toHaveLength(52);
    expect(new Set(TRACK_CELLS.map((c) => c.join(','))).size).toBe(52);
  });

  it('turns each team into its home column from the square just before it', () => {
    // Sun leaves the track at square 50 (0,7) into (1,7); Sky at square 24 (14,7) into (13,7).
    expect(TRACK_CELLS[50]).toEqual([0, 7]);
    expect(HOME_COLUMN.sun[0]).toEqual([1, 7]);
    expect(TRACK_CELLS[trackSquare('sky', 50) as number]).toEqual([14, 7]);
    expect(HOME_COLUMN.sky[0]).toEqual([13, 7]);
  });

  it('draws every position somewhere on the grid', () => {
    for (let p = BASE; p <= FINISH; p += 1) {
      const [c, r] = cellOf('sky', 0, p);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(14);
    }
  });
});

describe('teams and turns', () => {
  it('splits the room into two teams', () => {
    const s = newGame(['a', 'b', 'c'], 'a');
    expect(s.teams.sun.length + s.teams.sky.length).toBe(3);
    expect(s.teams.sun.length).toBe(2);
  });

  it('only the team whose turn it is can roll, and anyone on it can', () => {
    let s = game();
    s = run(s, { type: 'roll', by: 'c', value: 6 });
    expect(s.dice).toBeNull();
    s = run(s, { type: 'roll', by: 'b', value: 6 });
    expect(s.dice).toBe(6);
  });

  it('ignores an action with an old number, so two taps at once cannot both count', () => {
    let s = game();
    s = apply(s, { type: 'roll', by: 'a', value: 6, seq: 0 });
    const again = apply(s, { type: 'roll', by: 'b', value: 3, seq: 0 });
    expect(again).toBe(s);
  });

  it('needs a 6 to bring a token out, and passes the turn when nothing can move', () => {
    let s = run(game(), { type: 'roll', by: 'a', value: 4 });
    expect(s.turn).toBe('sky');
    expect(s.last).toContain('No moves');
    s = run(s, { type: 'roll', by: 'c', value: 6 });
    expect(movableTokens(s)).toEqual([0, 1, 2, 3]);
  });

  it('a 6 gives another roll', () => {
    const s = run(game(), { type: 'roll', by: 'a', value: 6 }, { type: 'move', by: 'a', token: 0 });
    expect(s.tokens.sun[0]).toBe(0);
    expect(s.turn).toBe('sun');
    expect(s.dice).toBeNull();
  });

  it('three 6s in a row lose the turn', () => {
    const s = run(
      game(),
      { type: 'roll', by: 'a', value: 6 },
      { type: 'move', by: 'a', token: 0 },
      { type: 'roll', by: 'a', value: 6 },
      { type: 'move', by: 'a', token: 0 },
      { type: 'roll', by: 'a', value: 6 },
    );
    expect(s.turn).toBe('sky');
  });
});

describe('moving and capturing', () => {
  it('sends a token back to base when landed on, but not on a safe square', () => {
    let s = game();
    // Sky token sits 4 squares past Sun's start (square 4, not safe); Sun token at 0 rolls a 4.
    s = { ...s, tokens: { sun: [0, BASE, BASE, BASE], sky: [30, BASE, BASE, BASE] } };
    expect(trackSquare('sky', 30)).toBe(4);
    s = run(s, { type: 'roll', by: 'a', value: 4 }, { type: 'move', by: 'a', token: 0 });
    expect(s.tokens.sky[0]).toBe(BASE);
    expect(s.turn).toBe('sun'); // a capture earns another roll

    let safe = game();
    safe = { ...safe, tokens: { sun: [0, BASE, BASE, BASE], sky: [34, BASE, BASE, BASE] } };
    expect(trackSquare('sky', 34)).toBe(8); // a star square
    safe = run(safe, { type: 'roll', by: 'a', value: 8 }, { type: 'move', by: 'a', token: 0 });
    expect(safe.tokens.sky[0]).toBe(34);
  });

  it('needs an exact roll to finish', () => {
    let s = { ...game(), tokens: { sun: [53, BASE, BASE, BASE], sky: [BASE, BASE, BASE, BASE] } };
    s = run(s, { type: 'roll', by: 'a', value: 5 });
    expect(s.turn).toBe('sky'); // 53 + 5 is past home, and nothing else can move
  });

  it('wins when every token is home, and nothing is kept afterwards', () => {
    let s = { ...game(), tokens: { sun: [FINISH, FINISH, FINISH, 54], sky: [BASE, BASE, BASE, BASE] } };
    s = run(s, { type: 'roll', by: 'b', value: 2 }, { type: 'move', by: 'b', token: 3 });
    expect(s.winner).toBe('sun');
    expect(run(s, { type: 'roll', by: 'c', value: 6 })).toBe(s);
  });

  it('leaving always works, whatever move number it carries, and keeps the numbers in step', () => {
    let s = run(game(), { type: 'roll', by: 'a', value: 6 });
    const before = s.seq;
    s = apply(s, { type: 'leave', by: 'b', seq: 0 });
    expect(s.teams.sun).toEqual(['a']);
    expect(s.seq).toBe(before);
  });

  it('a team with nobody left ends the game, and nobody is ever removed from the room', () => {
    let s = newGame(['a', 'c'], 'a', fixed);
    s = run(s, { type: 'leave', by: 'c' });
    expect(s.winner).toBe('sun');
    expect(s.teams.sky).toEqual([]);
  });
});
