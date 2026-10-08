import { SPEAK_SECONDS, VOTE_SECONDS, caught, phaseAt, seatState, type ImpostorRound } from '../src/games/impostor/logic';

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
