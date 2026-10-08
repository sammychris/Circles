import { draughts } from './draughts/engine';
import type { GameId, TableGame } from './tableGame';

// The games that run on the Table. A game that isn't here yet isn't offered.
export const GAMES: Partial<Record<GameId, TableGame<unknown>>> = {
  draughts: draughts as TableGame<unknown>,
};
