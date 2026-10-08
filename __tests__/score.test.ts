import { FINISH, apply, newGame } from '../src/games/ludo/engine';
import { addWin, carryOn, cleanScore, firstSide, keepTeams, newScore, replayPlan, scoreLine, setResult } from '../src/games/score';

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
      played: 0,
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

describe('Play again, fairly', () => {
  it('takes turns going first through a set', () => {
    let s = newScore('draughts', null);
    expect(firstSide(s)).toBe('sun');
    s = addWin(s, 'g1', 'sun');
    expect(firstSide(s)).toBe('sky');
    s = addWin(s, 'g2', 'draw');
    expect(firstSide(s)).toBe('sun');
  });

  it('keeps teams, never past the game limit, newcomers last', () => {
    const plan = replayPlan({
      score: addWin(newScore('chess', null), 'g1', 'sun'),
      teams: { sun: ['a', 'b', 'c'], sky: ['d', 'e', 'f'] },
      here: ['g', 'a', 'b', 'c', 'd', 'e', 'f'],
      max: 6,
      fresh: false,
    });
    expect(plan.teams).toEqual({ sun: ['a', 'b', 'c'], sky: ['d', 'e', 'f'] });
    expect(plan.score?.wins.sun).toBe(1);
    expect(plan.mixed).toBe(false);
  });

  it('starts over, and says so, when a team has gone', () => {
    const plan = replayPlan({
      score: addWin(newScore('ludo', 3), 'g1', 'sky'),
      teams: { sun: ['a'], sky: ['b'] },
      here: ['a', 'c'],
      max: 9,
      fresh: false,
    });
    expect(plan).toEqual({ score: newScore('ludo', 3), teams: null, mixed: true });
  });

  it('New teams starts the score again', () => {
    const plan = replayPlan({
      score: addWin(newScore('ludo', 5), 'g1', 'sky'),
      teams: { sun: ['a'], sky: ['b'] },
      here: ['a', 'b'],
      max: 9,
      fresh: true,
    });
    expect(plan).toEqual({ score: newScore('ludo', 5), teams: null, mixed: false });
  });

  it('drops Whot players who have left', () => {
    let s = addWin(newScore('whot', null), 'g1', 'ada');
    s = addWin(s, 'g2', 'bayo');
    const plan = replayPlan({ score: s, teams: undefined, here: ['ada', 'me'], max: 6, fresh: false });
    expect(plan.score?.wins).toEqual({ ada: 1 });
  });

  it('never believes a score for another game, or a set won without a target', () => {
    const raw = { game: 'draughts', target: null, wins: { sun: 4 }, counted: null, champion: 'sun', played: 4 };
    expect(cleanScore(raw, 'chess')).toBeUndefined();
    expect(cleanScore(raw, 'draughts')?.champion).toBeNull();
    expect(cleanScore({ ...raw, wins: { someone: 2 } }, 'draughts')?.wins).toEqual({});
  });
});
