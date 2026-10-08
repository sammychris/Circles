// Find the Impostor timing (play.md: about 30 seconds each to describe, then a vote; 3 rounds a game).
// Matches public.impostor_timing() in the database.
export const SPEAK_SECONDS = 30;
export const VOTE_SECONDS = 60;
export const ROUNDS_PER_GAME = 3;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

export type ImpostorRound = {
  roundId: string;
  number: number; // 1 to ROUNDS_PER_GAME
  order: string[]; // speaking order (user ids)
  startedAt: number; // ms, when the first person started describing
  gameId: string;
  startedBy: string;
};

export type RoundPhase =
  | { kind: 'speaking'; index: number; speaker: string; secondsLeft: number }
  | { kind: 'voting'; secondsLeft: number };

// Everyone's phone works out the same phase from the same start time, so no extra messages are needed.
export function phaseAt(round: ImpostorRound, now: number): RoundPhase {
  const elapsed = Math.max(0, Math.floor((now - round.startedAt) / 1000));
  const speakingTotal = round.order.length * SPEAK_SECONDS;
  if (elapsed < speakingTotal) {
    const index = Math.floor(elapsed / SPEAK_SECONDS);
    return { kind: 'speaking', index, speaker: round.order[index], secondsLeft: SPEAK_SECONDS - (elapsed % SPEAK_SECONDS) };
  }
  return { kind: 'voting', secondsLeft: Math.max(0, VOTE_SECONDS - (elapsed - speakingTotal)) };
}

export type SeatState = 'done' | 'talking' | 'next' | 'waiting';

// The speaking-order arc: who's done, who's talking, who's next.
export function seatState(round: ImpostorRound, phase: RoundPhase, id: string): SeatState {
  if (phase.kind === 'voting') return 'done';
  const i = round.order.indexOf(id);
  if (i < phase.index) return 'done';
  if (i === phase.index) return 'talking';
  if (i === phase.index + 1) return 'next';
  return 'waiting';
}

export type VoteCount = { target: string; votes: number };

export type Result = { impostor: string; word: string; counts: VoteCount[]; myVote: string | null };

// Did the room find them? The person with the most votes, if that's a clear single person.
export function caught(result: Result): boolean {
  const sorted = [...result.counts].sort((a, b) => b.votes - a.votes);
  if (sorted.length === 0 || sorted[0].votes === 0) return false;
  if (sorted[1] && sorted[1].votes === sorted[0].votes) return false;
  return sorted[0].target === result.impostor;
}
