// Ludo for two teams (docs/design/pages/play.md › Ludo on the table). Our own code, no outside licence.
// Each team has 4 tokens of one colour. Team Sun starts top left, Team Sky bottom right.
// A token's position is its progress from its own start square:
//   BASE (-1) = still at home base, 0..50 = on the shared track, 51..55 = home column, 56 = finished.
// The whole game is a pure reducer, so every phone applies the same actions in the same order.

import { addWin, type SetScore } from '../score';

export type Team = 'sun' | 'sky';
export const TEAMS: Team[] = ['sun', 'sky'];
// One person on each team.
export const MIN_PLAYERS = 2;
export const BASE = -1;
export const LAST_TRACK = 50;
export const FINISH = 56;
export const TRACK_LENGTH = 52;
export const START: Record<Team, number> = { sun: 0, sky: 26 };
// Start squares and star squares are safe: nobody can be sent home there.
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export type LudoState = {
  id: string; // which game this is, so phones never mix up two games
  teams: Record<Team, string[]>; // user ids on each team
  tokens: Record<Team, number[]>;
  turn: Team;
  dice: number | null; // rolled and waiting for a move
  sixes: number; // sixes in a row this turn
  winner: Team | null;
  seq: number; // how many actions have been applied; an action must carry the current seq
  startedBy: string;
  last: string; // what just happened, in words
  // The score while people keep playing (only for this sitting; src/games/score.ts). Every phone adds a
  // win the same way, in apply, so they all agree.
  set?: SetScore;
};

export type LudoAction =
  | { type: 'roll'; by: string; value: number; seq: number }
  | { type: 'move'; by: string; token: number; seq: number }
  | { type: 'leave'; by: string; seq: number };

export const TEAM_NAME: Record<Team, string> = { sun: 'Team Sun', sky: 'Team Sky' };

export function other(team: Team): Team {
  return team === 'sun' ? 'sky' : 'sun';
}

export function teamOf(state: LudoState, userId: string): Team | null {
  if (state.teams.sun.includes(userId)) return 'sun';
  if (state.teams.sky.includes(userId)) return 'sky';
  return null;
}

// Splits the people in the room into two teams at random. `random` is injectable for tests.
export function newGame(
  players: string[],
  startedBy: string,
  random: () => number = Math.random,
  id = `${Date.now().toString(36)}-${Math.floor(random() * 1e9).toString(36)}`,
  // Play again: the same teams, and the score carried on.
  keep: { teams?: Record<Team, string[]> | null; set?: SetScore; first?: Team } = {},
): LudoState {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const half = Math.ceil(shuffled.length / 2);
  return {
    id,
    teams: keep.teams ?? { sun: shuffled.slice(0, half), sky: shuffled.slice(half) },
    tokens: { sun: [BASE, BASE, BASE, BASE], sky: [BASE, BASE, BASE, BASE] },
    turn: keep.first ?? 'sun',
    dice: null,
    sixes: 0,
    winner: null,
    seq: 0,
    startedBy,
    last: `${TEAM_NAME[keep.first ?? 'sun']} goes first. Anyone on the team can roll.`,
    ...(keep.set ? { set: keep.set } : {}),
  };
}

// Where a token is on the shared track (0..51), or null when it's in base, the home column or finished.
export function trackSquare(team: Team, progress: number): number | null {
  if (progress < 0 || progress > LAST_TRACK) return null;
  return (START[team] + progress) % TRACK_LENGTH;
}

export function canMove(state: LudoState, token: number, dice = state.dice): boolean {
  if (dice === null || state.winner) return false;
  const pos = state.tokens[state.turn][token];
  if (pos === undefined || pos === FINISH) return false;
  if (pos === BASE) return dice === 6;
  return pos + dice <= FINISH;
}

export function movableTokens(state: LudoState, dice = state.dice): number[] {
  return [0, 1, 2, 3].filter((t) => canMove(state, t, dice));
}

function nextTurn(state: LudoState, last: string): LudoState {
  return { ...state, turn: other(state.turn), dice: null, sixes: 0, last };
}

// Applies one action. Anything invalid (wrong team, wrong turn, stale seq) leaves the state unchanged,
// so two people on a team tapping at once can't break the game.
// Leaving doesn't need (or change) the move number: it must always work, and must not
// shift the numbers of moves sent at the same moment.
export function apply(state: LudoState, action: LudoAction): LudoState {
  const next = play(state, action);
  // A win counts once towards the score for the sitting.
  if (next.winner && !state.winner && next.set) return { ...next, set: addWin(next.set, next.id, next.winner) };
  return next;
}

function play(state: LudoState, action: LudoAction): LudoState {
  const actorTeam = teamOf(state, action.by);
  const name = TEAM_NAME[state.turn];

  if (action.type === 'leave') {
    if (!actorTeam) return state;
    const teams = { ...state.teams, [actorTeam]: state.teams[actorTeam].filter((id) => id !== action.by) };
    const emptied = teams[actorTeam].length === 0;
    return {
      ...state,
      teams,
      winner: emptied && !state.winner ? other(actorTeam) : state.winner,
      last: emptied ? `${TEAM_NAME[actorTeam]} has nobody left, so the game ends.` : state.last,
    };
  }

  if (action.seq !== state.seq) return state;

  if (state.winner || actorTeam !== state.turn) return state;

  if (action.type === 'roll') {
    if (state.dice !== null) return state;
    const value = Math.floor(action.value);
    if (value < 1 || value > 6) return state;
    const seq = state.seq + 1;
    const sixes = value === 6 ? state.sixes + 1 : 0;
    if (sixes === 3) {
      return { ...nextTurn(state, `${name} rolled three 6s in a row, so it's ${TEAM_NAME[other(state.turn)]}'s turn.`), seq };
    }
    const rolled = { ...state, dice: value, sixes, seq };
    if (movableTokens(rolled).length === 0) {
      return { ...nextTurn(rolled, `${name} rolled a ${value}. No moves, so it's ${TEAM_NAME[other(state.turn)]}'s turn.`), seq };
    }
    return { ...rolled, last: `${name} rolled a ${value}` };
  }

  // move
  if (!canMove(state, action.token)) return state;
  const dice = state.dice as number;
  const mine = [...state.tokens[state.turn]];
  const from = mine[action.token];
  const to = from === BASE ? 0 : from + dice;
  mine[action.token] = to;

  const theirs = [...state.tokens[other(state.turn)]];
  let captured = 0;
  const square = trackSquare(state.turn, to);
  if (square !== null && !SAFE_SQUARES.has(square)) {
    theirs.forEach((pos, i) => {
      if (trackSquare(other(state.turn), pos) === square) {
        theirs[i] = BASE;
        captured += 1;
      }
    });
  }

  const tokens = { ...state.tokens, [state.turn]: mine, [other(state.turn)]: theirs } as Record<Team, number[]>;
  const seq = state.seq + 1;
  if (mine.every((p) => p === FINISH)) {
    return { ...state, tokens, dice: null, sixes: 0, seq, winner: state.turn, last: `${name} got every token home.` };
  }

  const reachedHome = to === FINISH;
  const again = dice === 6 || captured > 0 || reachedHome;
  const what = captured
    ? `${name} sent a ${TEAM_NAME[other(state.turn)]} token back to base.`
    : reachedHome
      ? `${name} got a token home.`
      : from === BASE
        ? `${name} brought out a token.`
        : `${name} moved ${dice}.`;
  if (again) return { ...state, tokens, dice: null, seq, last: `${what} Roll again.` };
  return { ...nextTurn({ ...state, tokens }, `${what} ${TEAM_NAME[other(state.turn)]}'s turn.`), seq };
}

// --- board drawing helpers: 15 × 15 grid cells as [column, row] ---

// The 52 track squares clockwise, starting at Team Sun's start square.
export const TRACK_CELLS: [number, number][] = (() => {
  const cells: [number, number][] = [];
  const run = (from: [number, number], dx: number, dy: number, n: number) => {
    for (let i = 0; i < n; i += 1) cells.push([from[0] + dx * i, from[1] + dy * i]);
  };
  run([1, 6], 1, 0, 5);
  run([6, 5], 0, -1, 6);
  run([7, 0], 1, 0, 2);
  run([8, 1], 0, 1, 5);
  run([9, 6], 1, 0, 6);
  run([14, 7], 0, 1, 2);
  run([13, 8], -1, 0, 5);
  run([8, 9], 0, 1, 6);
  run([7, 14], -1, 0, 2);
  run([6, 13], 0, -1, 5);
  run([5, 8], -1, 0, 6);
  run([0, 7], 0, -1, 2);
  return cells;
})();

export const HOME_COLUMN: Record<Team, [number, number][]> = {
  sun: [1, 2, 3, 4, 5].map((c) => [c, 7] as [number, number]),
  sky: [13, 12, 11, 10, 9].map((c) => [c, 7] as [number, number]),
};

// The four waiting spots inside each base.
export const BASE_CELLS: Record<Team, [number, number][]> = {
  sun: [
    [2, 2],
    [4, 2],
    [2, 4],
    [4, 4],
  ],
  sky: [
    [10, 10],
    [12, 10],
    [10, 12],
    [12, 12],
  ],
};

export const CENTRE: [number, number] = [7, 7];

export function cellOf(team: Team, token: number, progress: number): [number, number] {
  if (progress === BASE) return BASE_CELLS[team][token];
  if (progress === FINISH) return CENTRE;
  if (progress > LAST_TRACK) return HOME_COLUMN[team][progress - LAST_TRACK - 1];
  return TRACK_CELLS[trackSquare(team, progress) as number];
}

// The squares a token hops through on its way from one place to another, for the movement on screen.
// Empty when it was sent back to base (it just appears there).
export function hopPath(team: Team, token: number, from: number, to: number): [number, number][] {
  if (to === from || to === BASE) return [];
  if (from === BASE) return [cellOf(team, token, 0)];
  if (to < from) return [];
  const cells: [number, number][] = [];
  for (let p = from + 1; p <= to; p += 1) cells.push(cellOf(team, token, p));
  return cells;
}
