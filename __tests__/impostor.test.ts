import { SPEAK_SECONDS, VOTE_SECONDS, caught, phaseAt, preferRound, seatState, type ImpostorRound } from '../src/games/impostor/logic';

const round: ImpostorRound = { roundId: 'r', number: 1, order: ['a', 'b', 'c'], startedAt: 0, gameId: 'g', startedBy: 'a' };
const at = (s: number) => s * 1000;

describe('turns', () => {
  it('gives each person 30 seconds in order', () => {
    expect(phaseAt(round, at(0))).toEqual({ kind: 'speaking', index: 0, speaker: 'a', secondsLeft: SPEAK_SECONDS });
    expect(phaseAt(round, at(31))).toMatchObject({ kind: 'speaking', speaker: 'b', secondsLeft: 29 });
    expect(phaseAt(round, at(89))).toMatchObject({ kind: 'speaking', speaker: 'c', secondsLeft: 1 });
  });

  it('votes once everyone has spoken', () => {
    expect(phaseAt(round, at(90))).toEqual({ kind: 'voting', secondsLeft: VOTE_SECONDS });
    expect(phaseAt(round, at(500))).toEqual({ kind: 'voting', secondsLeft: 0 });
  });

  it('shows done, talking and next on the arc', () => {
    const p = phaseAt(round, at(35));
    expect(seatState(round, p, 'a')).toBe('done');
    expect(seatState(round, p, 'b')).toBe('talking');
    expect(seatState(round, p, 'c')).toBe('next');
  });
});

describe('caught', () => {
  const base = { impostor: 'b', word: 'Suya', myVote: null };
  it('needs a clear most-voted person who is the impostor', () => {
    expect(caught({ ...base, counts: [{ target: 'b', votes: 2 }, { target: 'c', votes: 1 }] })).toBe(true);
    expect(caught({ ...base, counts: [{ target: 'b', votes: 1 }, { target: 'c', votes: 1 }] })).toBe(false);
    expect(caught({ ...base, counts: [{ target: 'c', votes: 2 }, { target: 'b', votes: 1 }] })).toBe(false);
    expect(caught({ ...base, counts: [{ target: 'b', votes: 0 }] })).toBe(false);
  });
});

describe('every phone agrees on one round', () => {
  const r = (gameId: string, number: number, roundId: string, replaces?: string): ImpostorRound => ({
    ...round,
    gameId,
    number,
    roundId,
    replaces,
  });
  const none = new Set<string>();
  const both = (a: ImpostorRound, b: ImpostorRound, retired = none) => [
    preferRound(preferRound(null, a, retired), b, retired),
    preferRound(preferRound(null, b, retired), a, retired),
  ];

  it('Play again replaces the finished game on every phone', () => {
    const old = r('g1', 3, 'x');
    const again = r('g9', 1, 'y', 'g1');
    expect(both(old, again).map((x) => x?.gameId)).toEqual(['g9', 'g9']);
  });

  it('two people tapping Next round at once end up on the same round', () => {
    const a = r('g', 2, 'round-a');
    const b = r('g', 2, 'round-b');
    expect(both(a, b).map((x) => x?.roundId)).toEqual(['round-a', 'round-a']);
  });

  it('two people tapping Play again at once end up on the same game', () => {
    const a = r('g5', 1, 'a', 'g1');
    const b = r('g7', 1, 'b', 'g1');
    expect(both(a, b).map((x) => x?.gameId)).toEqual(['g5', 'g5']);
  });

  it('an ended game never comes back', () => {
    expect(preferRound(null, r('gone', 2, 'z'), new Set(['gone']))).toBeNull();
  });
});
