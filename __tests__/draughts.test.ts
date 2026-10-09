import { at, draughts, legalMoves, startBoard, type DraughtsGame } from '../src/games/draughts/engine';

const fixed = () => 0.1;
const game = (board: string, turn: 'sun' | 'sky' = 'sun'): DraughtsGame => ({
  teams: { sun: ['a'], sky: ['b'] },
  board,
  turn,
  chain: null,
  winner: null,
  quiet: 0,
  last: '',
  startedBy: 'a',
});
const empty = '.'.repeat(64);
const put = (board: string, i: number, p: string) => board.slice(0, i) + p + board.slice(i + 1);

describe('draughts', () => {
  it('starts with 12 pieces each and Sun to move', () => {
    const g = draughts.setup(['a', 'b', 'c'], 'a', fixed);
    expect(g.board.split('').filter((p) => p === 'u')).toHaveLength(12);
    expect(g.board.split('').filter((p) => p === 'k')).toHaveLength(12);
    expect(g.turn).toBe('sun');
    expect(legalMoves(g)).toHaveLength(7);
  });

  it('only lets the team whose turn it is move, and only legal moves', () => {
    const g = draughts.setup(['a', 'b'], 'a', fixed);
    const sky = g.teams.sky[0];
    const sun = g.teams.sun[0];
    expect(draughts.apply(g, { from: at(5, 0), to: at(4, 1) }, sky, 0)).toBeNull();
    expect(draughts.apply(g, { from: at(5, 0), to: at(3, 2) }, sun, 0)).toBeNull();
    const next = draughts.apply(g, { from: at(5, 0), to: at(4, 1) }, sun, 0);
    expect(next?.turn).toBe('sky');
  });

  it('makes capturing compulsory and keeps jumping in one turn', () => {
    let b = put(empty, at(5, 0), 'u');
    b = put(b, at(4, 1), 'k');
    b = put(b, at(2, 3), 'k');
    b = put(b, at(0, 7), 'k');
    const g = game(b);
    expect(legalMoves(g)).toEqual([{ from: at(5, 0), to: at(3, 2) }]);
    const mid = draughts.apply(g, { from: at(5, 0), to: at(3, 2) }, 'a', 0)!;
    expect(mid.chain).toBe(at(3, 2));
    expect(mid.turn).toBe('sun');
    const done = draughts.apply(mid, { from: at(3, 2), to: at(1, 4) }, 'a', 0)!;
    expect(done.board[at(4, 1)]).toBe('.');
    expect(done.board[at(2, 3)]).toBe('.');
    expect(done.turn).toBe('sky');
  });

  it('crowns a man that reaches the far side, and wins when the other team has no moves', () => {
    let b = put(empty, at(1, 2), 'u');
    b = put(b, at(7, 0), 'k');
    const g = game(b);
    const crowned = draughts.apply(g, { from: at(1, 2), to: at(0, 1) }, 'a', 0)!;
    expect(crowned.board[at(0, 1)]).toBe('U');
    // Sky's only man is on the far row and can't move: Sun wins.
    expect(crowned.winner).toBe('sun');
  });

  it('ends the game for a team with nobody left', () => {
    const g = draughts.setup(['a', 'b'], 'a', fixed);
    expect(draughts.leave!(g, g.teams.sky[0]).winner).toBe('sun');
    expect(startBoard()).toHaveLength(64);
  });
});
