// The score for one sitting (Sammy's decision, 2026-10-08): it adds up while people keep playing the
// same game in this room ("Team Sun 2, Team Sky 1"), and it's gone when the game comes off the table,
// the teams are mixed again, or the room ends. Never saved, never on a profile, no leaderboards
// (CLAUDE.md, Never list: never keep scores after a room ends). Not for Mafia or Find the Impostor:
// their roles change every game, and a count of who got caught can feel like picking on people.

export type ScoreGame = 'ludo' | 'draughts' | 'chess' | 'whot';
export const SCORED_GAMES: ScoreGame[] = ['ludo', 'draughts', 'chess', 'whot'];
// Team games score by team; Whot scores by person.
export const TEAM_SCORED: ScoreGame[] = ['ludo', 'draughts', 'chess'];
// "First to 3 wins" or "First to 5 wins"; or no target, just keep count.
export const TARGETS = [3, 5] as const;

export type SetScore = {
  game: ScoreGame;
  // First to this many wins takes the set. Null: just keep count.
  target: number | null;
  // Wins by team ('sun' or 'sky') or, in Whot, by person.
  wins: Record<string, number>;
  // The game last counted, so each win is only counted once.
  counted: string | null;
  // Who won the set, once someone reaches the target.
  champion: string | null;
};

export function newScore(game: ScoreGame, target: number | null): SetScore {
  return { game, target, wins: {}, counted: null, champion: null };
}

// A game just ended. `winner` is a team or a person; 'draw' or null counts nobody.
export function addWin(score: SetScore, gameId: string, winner: string | null): SetScore {
  if (score.counted === gameId || score.champion) return score;
  if (!winner || winner === 'draw') return { ...score, counted: gameId };
  const wins = { ...score.wins, [winner]: (score.wins[winner] ?? 0) + 1 };
  const champion = score.target !== null && wins[winner] >= score.target ? winner : null;
  return { ...score, wins, counted: gameId, champion };
}

// Play again: the score carries on, or, once someone has won the set, a new set starts.
export function carryOn(score: SetScore | undefined): SetScore | undefined {
  if (!score) return undefined;
  return score.champion ? newScore(score.game, score.target) : score;
}

// "Team Sun 2, Team Sky 1", or in Whot the people with wins, most first ("Ada_K 2, You 1").
export function scoreLine(score: SetScore, nameOf: (key: string) => string): string {
  const keys = TEAM_SCORED.includes(score.game)
    ? ['sun', 'sky']
    : Object.keys(score.wins)
        .filter((k) => score.wins[k] > 0)
        .sort((a, b) => score.wins[b] - score.wins[a])
        .slice(0, 3);
  if (keys.length === 0) return 'No wins yet';
  return keys.map((k) => `${nameOf(k)} ${score.wins[k] ?? 0}`).join(', ');
}

// "3 to 1": the set's result, winner first.
export function setResult(score: SetScore): string {
  const all = Object.values(score.wins).sort((a, b) => b - a);
  const best = all[0] ?? 0;
  const next = TEAM_SCORED.includes(score.game) ? (score.wins.sun === best ? (score.wins.sky ?? 0) : (score.wins.sun ?? 0)) : (all[1] ?? 0);
  return `${best} to ${next}`;
}

const KEY = /^[A-Za-z0-9_-]{1,64}$/;

// A score arriving from another phone: only well-formed scores are believed.
export function cleanScore(raw: unknown): SetScore | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (!SCORED_GAMES.includes(r.game as ScoreGame)) return undefined;
  const target = r.target === null ? null : TARGETS.includes(r.target as 3 | 5) ? (r.target as number) : undefined;
  if (target === undefined) return undefined;
  if (!r.wins || typeof r.wins !== 'object') return undefined;
  const wins: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.wins as Record<string, unknown>).slice(0, 12)) {
    if (KEY.test(k) && typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 99) wins[k] = v;
  }
  const counted = typeof r.counted === 'string' && r.counted.length <= 80 ? r.counted : null;
  const champion = typeof r.champion === 'string' && KEY.test(r.champion) ? r.champion : null;
  return { game: r.game as ScoreGame, target, wins, counted, champion };
}

// Play again with the same teams: people still here keep their team, and anyone new joins the
// smaller one. Null when a team has nobody left (then the teams are mixed again and the score starts over).
export function keepTeams<S extends string>(teams: Record<S, string[]>, here: string[]): Record<S, string[]> | null {
  const sides = Object.keys(teams) as S[];
  const kept = Object.fromEntries(sides.map((s) => [s, teams[s].filter((id) => here.includes(id))])) as Record<S, string[]>;
  if (sides.some((s) => kept[s].length === 0)) return null;
  for (const id of here) {
    if (sides.some((s) => kept[s].includes(id))) continue;
    const smaller = sides.reduce((a, b) => (kept[b].length < kept[a].length ? b : a));
    kept[smaller] = [...kept[smaller], id];
  }
  return kept;
}

// "Team Sun wins the set, 3 to 1" (or "You win the set, 3 to 2"). Null until someone has won the set.
export function setWinnerLine(score: SetScore | undefined, nameOf: (key: string) => string): string | null {
  if (!score?.champion) return null;
  const who = nameOf(score.champion);
  return `${who} ${who === 'You' ? 'win' : 'wins'} the set, ${setResult(score)}`;
}
