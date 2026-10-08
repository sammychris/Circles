// Draughts in two teams, on an 8 x 8 board (English rules): men move diagonally forward, capturing is
// compulsory, a man can jump several times in one turn, and a man reaching the far side becomes a king,
// which moves one square in any diagonal direction. Our own code, no outside licence.
// The team whose turn it is talks it over, then anyone on the team makes the move (play.md).

import { SIDE_NAME, otherSide, sideOf, splitTeams, type Side, type TableGame } from '../tableGame';

// Board: 64 characters, row by row from Team Sky's side (row 0) to Team Sun's side (row 7).
// '.' empty, 'u' Sun man, 'U' Sun king, 'k' Sky man, 'K' Sky king.
export type DraughtsGame = {
  teams: Record<Side, string[]>;
  board: string;
  turn: Side;
  // In the middle of a multi-jump: the square the jumping piece is on.
  chain: number | null;
  winner: Side | 'draw' | null;
  // Moves in a row without a capture; 80 means a draw.
  quiet: number;
  last: string;
  startedBy: string;
};

export type DraughtsMove = { from: number; to: number };

const DRAW_AFTER = 80;

export const at = (r: number, c: number) => r * 8 + c;
export const rowOf = (i: number) => Math.floor(i / 8);
export const colOf = (i: number) => i % 8;
const dark = (r: number, c: number) => (r + c) % 2 === 1;

export function startBoard(): string {
  let b = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) b += !dark(r, c) ? '.' : r < 3 ? 'k' : r > 4 ? 'u' : '.';
  }
  return b;
}

export const pieceSide = (p: string): Side | null => (p === 'u' || p === 'U' ? 'sun' : p === 'k' || p === 'K' ? 'sky' : null);
const isKing = (p: string) => p === 'U' || p === 'K';
// Sun starts at the bottom and moves up (towards row 0); Sky moves down.
const forward = (s: Side) => (s === 'sun' ? -1 : 1);

function directions(p: string): [number, number][] {
  const side = pieceSide(p);
  if (!side) return [];
  const f = forward(side);
  return isKing(p) ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[f, 1], [f, -1]];
}

const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function capturesFrom(board: string, from: number): DraughtsMove[] {
  const p = board[from];
  const side = pieceSide(p);
  if (!side) return [];
  const out: DraughtsMove[] = [];
  for (const [dr, dc] of directions(p)) {
    const r1 = rowOf(from) + dr;
    const c1 = colOf(from) + dc;
    const r2 = r1 + dr;
    const c2 = c1 + dc;
    if (!inside(r2, c2)) continue;
    const over = board[at(r1, c1)];
    if (pieceSide(over) === otherSide(side) && board[at(r2, c2)] === '.') out.push({ from, to: at(r2, c2) });
  }
  return out;
}

function stepsFrom(board: string, from: number): DraughtsMove[] {
  const out: DraughtsMove[] = [];
  for (const [dr, dc] of directions(board[from])) {
    const r = rowOf(from) + dr;
    const c = colOf(from) + dc;
    if (inside(r, c) && board[at(r, c)] === '.') out.push({ from, to: at(r, c) });
  }
  return out;
}

// Every move the team whose turn it is may make. Capturing is compulsory.
export function legalMoves(g: Pick<DraughtsGame, 'board' | 'turn' | 'chain'>): DraughtsMove[] {
  if (g.chain !== null) return capturesFrom(g.board, g.chain);
  const mine: number[] = [];
  for (let i = 0; i < 64; i++) if (pieceSide(g.board[i]) === g.turn) mine.push(i);
  const captures = mine.flatMap((i) => capturesFrom(g.board, i));
  return captures.length > 0 ? captures : mine.flatMap((i) => stepsFrom(g.board, i));
}

function count(board: string, side: Side): number {
  let n = 0;
  for (const p of board) if (pieceSide(p) === side) n++;
  return n;
}

export const draughts: TableGame<DraughtsGame> = {
  id: 'draughts',
  name: 'Draughts',
  line: 'Two teams. Talk each move over',
  min: 2,
  max: 6,
  setup(players, startedBy, random) {
    return { teams: splitTeams(players, random), board: startBoard(), turn: 'sun', chain: null, winner: null, quiet: 0, last: 'Team Sun goes first', startedBy };
  },
  apply(g, raw, by) {
    if (g.winner) return null;
    if (sideOf(g.teams, by) !== g.turn) return null;
    const m = raw as Partial<DraughtsMove>;
    if (typeof m?.from !== 'number' || typeof m?.to !== 'number') return null;
    if (!legalMoves(g).some((x) => x.from === m.from && x.to === m.to)) return null;
    const from = m.from;
    const to = m.to;
    const jumped = Math.abs(rowOf(to) - rowOf(from)) === 2;
    const cells = g.board.split('');
    let piece = cells[from];
    cells[from] = '.';
    if (jumped) cells[at((rowOf(from) + rowOf(to)) / 2, (colOf(from) + colOf(to)) / 2)] = '.';
    const crowned = !isKing(piece) && ((g.turn === 'sun' && rowOf(to) === 0) || (g.turn === 'sky' && rowOf(to) === 7));
    if (crowned) piece = piece.toUpperCase();
    cells[to] = piece;
    const board = cells.join('');
    // A capture that can carry on continues, unless the man was just crowned.
    if (jumped && !crowned && capturesFrom(board, to).length > 0) {
      return { ...g, board, chain: to, quiet: 0, last: `${SIDE_NAME[g.turn]} captured. Keep jumping` };
    }
    const next = otherSide(g.turn);
    const quiet = jumped ? 0 : g.quiet + 1;
    const base = { ...g, board, chain: null, turn: next, quiet };
    if (count(board, next) === 0 || legalMoves({ board, turn: next, chain: null }).length === 0) {
      return { ...base, winner: g.turn, last: `${SIDE_NAME[g.turn]} won this game` };
    }
    if (quiet >= DRAW_AFTER) return { ...base, winner: 'draw', last: 'A draw: nobody captured for a long time' };
    return { ...base, last: `${SIDE_NAME[g.turn]} ${jumped ? 'captured' : 'moved'}${crowned ? ' and made a king' : ''}` };
  },
  publicView: (g) => g,
  winnerKey: (g) => g.winner,
  firstMover: (g, side) => ({ ...g, turn: side, last: `${SIDE_NAME[side]} goes first` }),
  leave(g, person) {
    const teams = { sun: g.teams.sun.filter((p) => p !== person), sky: g.teams.sky.filter((p) => p !== person) };
    // A team with nobody left loses, so the game never gets stuck.
    if (!g.winner && (teams.sun.length === 0 || teams.sky.length === 0)) {
      const winner: Side = teams.sun.length === 0 ? 'sky' : 'sun';
      return { ...g, teams, winner, last: `${SIDE_NAME[winner]} won: the other team left` };
    }
    return { ...g, teams };
  },
};
