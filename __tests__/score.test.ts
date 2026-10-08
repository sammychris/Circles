import { FINISH, apply, newGame } from '../src/games/ludo/engine';
import { addWin, carryOn, cleanScore, keepTeams, newScore, scoreLine, setResult } from '../src/games/score';

const team = (k: string) => (k === 'sun' ? 'Team Sun' : 'Team Sky');

describe('the score for one sitting', () => {
  it('adds up wins, once per game', () => {
    let s = newScore('draughts', null);
    s = addWin(s, 'g1', 'sun');
    s = addWin(s, 'g1', 'sun');
    s = addWin(s, 'g2', 'sky');
    s = addWin(s, 'g3', 'sun');
    expect(scoreLine(s, team)).toBe('Team Sun 2, Team Sky 1');
    expect(s.champion).toBeNull();
  });

  it("doesn't count a draw for anyone", () => {
    const s = addWin(newScore('chess', null), 'g1', 'draw');
    expect(scoreLine(s, team)).toBe('Team Sun 0, Team Sky 0');
  });

  it('crowns the first to the target, then starts a new set on Play again', () => {
    let s = newScore('ludo', 3);
    for (const [id, w] of [
      ['a', 'sun'],
      ['b', 'sky'],
      ['c', 'sun'],
      ['d', 'sun'],
    ])
      s = addWin(s, id, w);
    expect(s.champion).toBe('sun');
    expect(setResult(s)).toBe('3 to 1');
    expect(addWin(s, 'e', 'sky')).toBe(s);
    expect(carryOn(s)).toEqual(newScore('ludo', 3));
    const going = addWin(newScore('ludo', 3), 'a', 'sky');
    expect(carryOn(going)).toBe(going);
  });

  it('scores Whot by person, most wins first', () => {
    let s = newScore('whot', null);
    s = addWin(s, '1', 'ada');
    s = addWin(s, '2', 'me');
    s = addWin(s, '3', 'ada');
    expect(scoreLine(s, (k) => (k === 'me' ? 'You' : 'Ada_K'))).toBe('Ada_K 2, You 1');
    expect(scoreLine(newScore('whot', null), String)).toBe('No wins yet');
  });

  it('only believes well-formed scores from other phones', () => {
    expect(cleanScore({ game: 'draughts', target: 3, wins: { sun: 1 }, counted: 'x', champion: null })).toEqual({
      game: 'draughts',
      target: 3,
      wins: { sun: 1 },
      counted: 'x',
      champion: null,
    });
    expect(cleanScore({ game: 'mafia', target: null, wins: {} })).toBeUndefined();
    expect(cleanScore({ game: 'chess', target: 99, wins: {} })).toBeUndefined();
    expect(cleanScore({ game: 'chess', target: null, wins: { sun: -4, 'bad key!': 2 } })?.wins).toEqual({});
  });
});

describe('Play again with the same teams', () => {
  it('keeps people on their team and puts newcomers on the smaller one', () => {
    expect(keepTeams({ sun: ['a', 'b'], sky: ['c'] }, ['a', 'b', 'c', 'd'])).toEqual({ sun: ['a', 'b'], sky: ['c', 'd'] });
  });

  it('drops people who left', () => {
    expect(keepTeams({ sun: ['a', 'b'], sky: ['c', 'd'] }, ['a', 'c', 'd'])).toEqual({ sun: ['a'], sky: ['c', 'd'] });
  });

  it('gives up when a team has nobody left', () => {
    expect(keepTeams({ sun: ['a'], sky: ['c'] }, ['c', 'd'])).toBeNull();
  });
});

describe('Ludo keeps the score the same way on every phone', () => {
  it('counts the win when the game is won, and carries the teams on Play again', () => {
    const g = newGame(['a', 'b'], 'a', () => 0.5, 'g1', { set: newScore('ludo', 3) });
    const team = g.teams.sun.includes('a') ? 'sun' : 'sky';
    const nearly = { ...g, turn: team as 'sun' | 'sky', dice: 1, tokens: { ...g.tokens, [team]: [FINISH, FINISH, FINISH, FINISH - 1] } };
    const won = apply(nearly, { type: 'move', by: 'a', token: 3, seq: nearly.seq });
    expect(won.winner).toBe(team);
    expect(won.set?.wins[team]).toBe(1);
    const again = newGame(['a', 'b'], 'a', () => 0.1, 'g2', { teams: won.teams, set: carryOn(won.set) });
    expect(again.teams).toEqual(won.teams);
    expect(again.set?.wins[team]).toBe(1);
  });
});
