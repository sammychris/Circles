import { apply, type LudoAction, type LudoState } from './engine';

// How phones agree on one game even when messages arrive in different orders.
// The rule every phone follows: a game nobody has won beats a finished one; between two running
// games, the one with the smaller id wins. Same rule everywhere, so everyone ends up on the same game.
export function preferGame(current: LudoState | null, incoming: LudoState): LudoState {
  if (!current) return incoming;
  if (incoming.id === current.id) return incoming.seq > current.seq ? incoming : current;
  if (current.winner && !incoming.winner) return incoming;
  if (!current.winner && incoming.winner) return current;
  return incoming.id < current.id ? incoming : current;
}

export type ActionResult = { state: LudoState | null; resync: boolean };

// Applies a move meant for game `gameId`. A move from the future means this phone missed one,
// so it asks the room for the current game instead of freezing.
export function receiveAction(current: LudoState | null, gameId: string, action: LudoAction): ActionResult {
  if (!current || current.id !== gameId) return { state: current, resync: false };
  if (action.type !== 'leave' && action.seq > current.seq) return { state: current, resync: true };
  return { state: apply(current, action), resync: false };
}

// People on a team who are no longer in the room. Their team stays playable without them.
export function absentPlayers(state: LudoState, inRoom: string[]): string[] {
  const here = new Set(inRoom);
  return [...state.teams.sun, ...state.teams.sky].filter((id) => !here.has(id));
}
