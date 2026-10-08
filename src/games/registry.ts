import { chessGame } from './chess/engine';
import { draughts } from './draughts/engine';
import { whot } from './whot/engine';
import type { GameId, TableGame } from './tableGame';

// The games that run on the Table. A game that isn't here yet isn't offered.
export const GAMES: Partial<Record<GameId, TableGame<unknown>>> = {
  draughts: draughts as TableGame<unknown>,
  chess: chessGame as TableGame<unknown>,
  whot: whot as TableGame<unknown>,
};
