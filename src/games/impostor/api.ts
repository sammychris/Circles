import { supabase } from '../../lib/supabase';
import type { Result } from './logic';

export async function startRound(roomId: string, gameId: string, players: string[]): Promise<{ roundId: string; order: string[] }> {
  const { data, error } = await supabase.rpc('start_impostor_round', { p_room: roomId, p_game: gameId, p_players: players });
  if (error) throw error;
  const row = (data as { round_id: string; speaking_order: string[] }[])[0];
  return { roundId: row.round_id, order: row.speaking_order };
}

// Your word, or '' when you're the impostor.
export async function myCard(roundId: string): Promise<string> {
  const { data, error } = await supabase.rpc('my_impostor_card', { p_round: roundId });
  if (error) throw error;
  return (data as string) ?? '';
}

export async function vote(roundId: string, target: string): Promise<void> {
  const { error } = await supabase.rpc('cast_impostor_vote', { p_round: roundId, p_target: target });
  if (error) throw error;
}

// null until everyone has voted or time is up.
export async function result(roundId: string): Promise<{ ready: false; myVote: string | null } | ({ ready: true } & Result)> {
  const { data, error } = await supabase.rpc('impostor_result', { p_round: roundId });
  if (error) throw error;
  const rows = (data ?? []) as { ready: boolean; impostor: string | null; word: string | null; target: string | null; votes: number; my_vote: string | null }[];
  if (!rows[0]?.ready) return { ready: false, myVote: rows[0]?.my_vote ?? null };
  return {
    ready: true,
    impostor: rows[0].impostor as string,
    word: rows[0].word as string,
    myVote: rows[0].my_vote,
    counts: rows.map((r) => ({ target: r.target as string, votes: Number(r.votes) })),
  };
}

// The game is over: the server deletes its rounds and votes (nothing is kept).
export async function endGame(gameId: string): Promise<void> {
  await supabase.rpc('end_impostor_game', { p_game: gameId });
}
