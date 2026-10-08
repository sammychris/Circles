import { supabase } from '../lib/supabase';
import { TEST_ROOM_ID } from '../config';

export type RoomTicket = { token: string; url: string; roomName: string };

export class RoomFullError extends Error {
  constructor() {
    super('This room is full');
  }
}

// Asks the Supabase function for a LiveKit ticket. The function checks who you are and whether the room is open.
export async function fetchRoomTicket(roomId: string = TEST_ROOM_ID): Promise<RoomTicket> {
  const { data, error } = await supabase.functions.invoke('livekit-token', { body: { roomId } });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 409) throw new RoomFullError();
    throw new Error('Could not get a ticket for the room');
  }
  const ticket = data as Partial<RoomTicket> | null;
  if (!ticket?.token || !ticket.url || !ticket.roomName) throw new Error('The room ticket was incomplete');
  return ticket as RoomTicket;
}
