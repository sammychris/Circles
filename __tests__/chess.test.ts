import { chessGame, describe as say, targets, turnOf, type ChessGame } from '../src/games/chess/engine';

const game = (sun: string[], sky: string[]): ChessGame => ({ ...chessGame.setup([...sun, ...sky], sun[0], () => 0.5), teams: { sun, sky } });

describe('chess in teams', () => {
  it('describes moves in words', () => {
    const g = game(['a'], ['b']);
    expect(say(g.fen, 'g1', 'f3', null)).toBe('Knight to f3');
    expect(say(g.fen, 'e2', 'e5', null)).toBeNull();
    expect(targets(g.fen, 'e2').sort()).toEqual(['e3', 'e4']);
  });

  it('plays straight away for a team of one, only on its turn', () => {
    const g = game(['a'], ['b']);
    expect(chessGame.apply(g, { type: 'suggest', from: 'e7', to: 'e5' }, 'b', 0)).toBeNull();
    const next = chessGame.apply(g, { type: 'suggest', from: 'e2', to: 'e4' }, 'a', 0)!;
    expect(turnOf(next.fen)).toBe('sky');
    expect(next.lastMove).toEqual({ from: 'e2', to: 'e4' });
  });

  it('waits for most of the team to agree, or 60 seconds', () => {
    const g = game(['a', 'c', 'd'], ['b']);
    const s = chessGame.apply(g, { type: 'suggest', from: 'e2', to: 'e4' }, 'a', 1000)!;
    expect(s.pending?.san).toBe('Pawn to e4');
    expect(turnOf(s.fen)).toBe('sun');
    expect(chessGame.apply(s, { type: 'agree' }, 'a', 1000)).toBeNull();
    const agreed = chessGame.apply(s, { type: 'agree' }, 'c', 2000)!;
    expect(turnOf(agreed.fen)).toBe('sky');
    expect(chessGame.tick!(s, 30_000, [])).toBeNull();
    expect(turnOf(chessGame.tick!(s, 61_001, [])!.fen)).toBe('sky');
  });

  it('knows checkmate', () => {
    let g = game(['a'], ['b']);
    for (const [by, from, to] of [['a', 'f2', 'f3'], ['b', 'e7', 'e5'], ['a', 'g2', 'g4'], ['b', 'd8', 'h4']]) {
      g = chessGame.apply(g, { type: 'suggest', from, to }, by, 0)!;
    }
    expect(g.winner).toBe('sky');
  });

  it('keeps the first suggestion\'s clock, so suggesting again cannot hold up the game', () => {
    const g = game(['a', 'c'], ['b']);
    const first = chessGame.apply(g, { type: 'suggest', from: 'e2', to: 'e4' }, 'a', 1000)!;
    const second = chessGame.apply(first, { type: 'suggest', from: 'd2', to: 'd4' }, 'c', 50_000)!;
    expect(second.pending?.at).toBe(1000);
    const played = chessGame.tick!(second, 61_000, [])!;
    expect(played.lastMove).toEqual({ from: 'd2', to: 'd4' });
  });
});
