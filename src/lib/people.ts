import { supabase } from './supabase';

export type PersonRef = { id: string; nickname: string };

// Saves are secret: only you see who you saved. You connect only when they save you too.
export async function mySavedIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('saves').select('saved_id');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.saved_id as string));
}

export async function savePerson(me: string, person: PersonRef): Promise<void> {
  const { error } = await supabase
    .from('saves')
    .upsert({ saver_id: me, saved_id: person.id, saved_nickname: person.nickname }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function unsavePerson(me: string, personId: string): Promise<void> {
  const { error } = await supabase.from('saves').delete().eq('saver_id', me).eq('saved_id', personId);
  if (error) throw error;
}

export async function myConnections(): Promise<PersonRef[]> {
  const { data, error } = await supabase.rpc('my_connections');
  if (error) throw error;
  return ((data as { person_id: string; nickname: string | null }[]) ?? []).map((r) => ({
    id: r.person_id,
    nickname: r.nickname ?? 'Someone',
  }));
}

// A private thank-you after a room. The person only ever sees a count, never who.
export async function thankPerson(me: string, personId: string, roomId: string): Promise<void> {
  const { error } = await supabase
    .from('thanks')
    .upsert({ from_id: me, to_id: personId, room_id: roomId }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function unthankPerson(me: string, personId: string, roomId: string): Promise<void> {
  const { error } = await supabase.from('thanks').delete().eq('from_id', me).eq('to_id', personId).eq('room_id', roomId);
  if (error) throw error;
}

export async function myThanksCount(): Promise<number> {
  const { data, error } = await supabase.rpc('my_thanks_count');
  if (error) throw error;
  return Number(data ?? 0);
}
