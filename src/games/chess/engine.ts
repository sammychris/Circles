// Chess in teams (play.md › Chess in teams). The rules come from chess.js (BSD-2-Clause licence,
// proven and widely used). Each team keeps its colour and name; which one has the first move (chess's
// "white") takes turns through a set (Sammy, 2026-10-08: swap places, not colours). On your team's turn, anyone suggests a
// move; it's played when most of the team agrees, or after 60 seconds with the latest suggestion.

import { Chess } from 'chess.js';
import { SIDE_NAME, otherSide, sideOf, splitTeams, type Side, type TableGame } from '../tableGame';

export const AGREE_SECONDS = 60;

export type Suggestion = { by: string; from: string; to: string; promotion: string | null; san: string; agrees: string[]; at: number };

export type ChessGame = {
  teams: Record<Side, string[]>;
  fen: string;
  pending: Suggestion | null;
  winner: Side | 'draw' | null;
  last: string;
  // The last move played, to show on the board.
  lastMove: { from: string; to: string } | null;
  startedBy: string;
  // The starter's clock when this was sent, so each phone can count down on its own clock.
  sentAt: number;
  // The team with the first move (chess's white pieces). Team Sun when not set.
  white?: Side;
};

export type ChessMove = { type: 'suggest'; from: string; to: string; promotion?: string } | { type: 'agree' };

const SQUARE = /^[a-h][1-8]$/;

// Whose turn it is: the team with white when it's white to move.
export const turnOf = (fen: string, white: Side = 'sun'): Side => (fen.split(' ')[1] === 'b' ? otherSide(white) : white);
// Which pieces a team moves ('w' or 'b'), and whose a piece is ('wq' → the team with white).
export const colourOf = (g: Pick<ChessGame, 'white'>, side: Side): 'w' | 'b' => (side === (g.white ?? 'sun') ? 'w' : 'b');
export const teamOfPiece = (g: Pick<ChessGame, 'white'>, code: string): Side => (code[0] === 'w' ? (g.white ?? 'sun') : otherSide(g.white ?? 'sun'));

const PIECE_NAME: Record<string, string> = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

// "Knight to f3", "Pawn takes e5", "Castle".
export function describe(fen: string, from: string, to: string, promotion: string | null): string | null {
  const chess = new Chess(fen);
  try {
    const m = chess.move({ from, to, promotion: promotion ?? undefined });
    if (m.san.startsWith('O-O')) return 'Castle';
    return `${PIECE_NAME[m.piece]} ${m.captured ? 'takes' : 'to'} ${m.to}${m.promotion ? `, becomes a ${PIECE_NAME[m.promotion].toLowerCase()}` : ''}`;
  } catch {
    return null;
  }
}

// Squares the piece on `from` can go to, for the team whose turn it is.
export function targets(fen: string, from: string): string[] {
  const chess = new Chess(fen);
  try {
    return chess.moves({ square: from as never, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}

function play(g: ChessGame, s: Suggestion): ChessGame {
  const chess = new Chess(g.fen);
  const side = turnOf(g.fen, g.white);
  try {
    chess.move({ from: s.from, to: s.to, promotion: s.promotion ?? undefined });
  } catch {
    return { ...g, pending: null };
  }
  const fen = chess.fen();
  const base = { ...g, fen, pending: null, lastMove: { from: s.from, to: s.to }, last: `${SIDE_NAME[side]} played ${s.san}` };
  if (chess.isCheckmate()) return { ...base, winner: side, last: `Checkmate. ${SIDE_NAME[side]} won this game` };
  if (chess.isDraw() || chess.isStalemate()) return { ...base, winner: 'draw', last: "It's a draw" };
  return chess.inCheck() ? { ...base, last: `${base.last}. Check` } : base;
}

const needed = (team: string[]) => Math.floor(team.length / 2) + 1;

export const chessGame: TableGame<ChessGame> = {
  id: 'chess',
  name: 'Chess in teams',
  line: 'Suggest a move, agree it together',
  min: 2,
  max: 6,
  setup(players, startedBy, random) {
    return { teams: splitTeams(players, random), fen: new Chess().fen(), pending: null, winner: null, last: 'Team Sun goes first', lastMove: null, startedBy, sentAt: 0 };
  },
  apply(g, raw, by, now) {
    if (g.winner) return null;
    const side = turnOf(g.fen, g.white);
    if (sideOf(g.teams, by) !== side) return null;
    const m = raw as Partial<ChessMove> & Record<string, unknown>;
    if (m?.type === 'suggest') {
      if (typeof m.from !== 'string' || typeof m.to !== 'string' || !SQUARE.test(m.from) || !SQUARE.test(m.to)) return null;
      const promotion = typeof m.promotion === 'string' && ['q', 'r', 'b', 'n'].includes(m.promotion) ? m.promotion : null;
      const san = describe(g.fen, m.from, m.to, promotion ?? 'q');
      if (!san) return null;
      // A new suggestion replaces the last one but keeps its clock, so nobody can hold up the game by
      // suggesting again and again: a minute after the first suggestion, the latest one is played.
      const s: Suggestion = { by, from: m.from, to: m.to, promotion: promotion ?? 'q', san, agrees: [by], at: g.pending?.at ?? now };
      // A team of one, or enough agreement already: played straight away.
      return s.agrees.length >= needed(g.teams[side]) ? play(g, s) : { ...g, pending: s, last: `${SIDE_NAME[side]} is talking it over` };
    }
    if (m?.type === 'agree') {
      if (!g.pending || g.pending.agrees.includes(by)) return null;
      const s = { ...g.pending, agrees: [...g.pending.agrees, by] };
      return s.agrees.length >= needed(g.teams[side]) ? play(g, s) : { ...g, pending: s };
    }
    return null;
  },
  publicView: (g) => ({ ...g, sentAt: Date.now() }),
  winnerKey: (g) => g.winner,
  firstMover: (g, side) => ({ ...g, white: side, last: `${SIDE_NAME[side]} goes first` }),
  tick(g, now) {
    if (g.winner || !g.pending) return null;
    return now - g.pending.at >= AGREE_SECONDS * 1000 ? play(g, g.pending) : null;
  },
  leave(g, person) {
    const teams = { sun: g.teams.sun.filter((p) => p !== person), sky: g.teams.sky.filter((p) => p !== person) };
    if (!g.winner && (teams.sun.length === 0 || teams.sky.length === 0)) {
      const winner: Side = teams.sun.length === 0 ? 'sky' : 'sun';
      return { ...g, teams, winner, pending: null, last: `${SIDE_NAME[winner]} won: the other team left` };
    }
    const pending = g.pending ? { ...g.pending, agrees: g.pending.agrees.filter((p) => p !== person) } : null;
    return { ...g, teams, pending };
  },
};

export { otherSide };
