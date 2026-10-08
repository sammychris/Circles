import { supabase } from '../lib/supabase';

export type Door = 'talk' | 'play' | 'support';
export type Mood = 'chat' | 'laugh' | 'advice';

export type RoomInfo = { id: string; door: Door; mood: Mood | null; title: string; capacity: number };

export type RoomTicket = { token: string; url: string; roomName: string; room: RoomInfo; isHost: boolean };

// How someone gets into a room: matched through a door, or picked from the Open now list.
export type RoomRequest =
  | { kind: 'match'; door: Door; mood: Mood | null; excludeRoomId?: string }
  | { kind: 'join'; roomId: string };

export class RoomFullError extends Error {
  constructor() {
    super('This room is full');
  }
}

// Support door only: there is no trained host online, so no room can open.
export class NoHostError extends Error {
  constructor() {
    super('No host online');
  }
}

export class PausedError extends Error {
  constructor() {
    super('Your account is paused');
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('livekit-token', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const status = context?.status;
    let payload: { status?: string; error?: string } = {};
    try {
      payload = (await context?.json()) ?? {};
    } catch {
      // not JSON
    }
    if (payload.status === 'no_host') throw new NoHostError();
    if (status === 409) throw new RoomFullError();
    if (status === 403 && payload.error === 'Your account is paused') throw new PausedError();
    throw new Error(payload.error ?? 'Could not reach the room server');
  }
  return data as T;
}

export async function getTicket(request: RoomRequest): Promise<RoomTicket> {
  const data = await call<Partial<RoomTicket> & { status?: string }>(
    request.kind === 'match'
      ? { action: 'match', door: request.door, mood: request.mood, excludeRoomId: request.excludeRoomId }
      : { action: 'join', roomId: request.roomId },
  );
  if (data.status === 'no_host') throw new NoHostError();
  if (!data.token || !data.url || !data.room) throw new Error('The room ticket was incomplete');
  return data as RoomTicket;
}

export type OpenRoom = { id: string; title: string; mood: Mood | null; capacity: number; here: number };

export async function listOpenRooms(door: Door = 'talk'): Promise<OpenRoom[]> {
  const data = await call<{ rooms: OpenRoom[] }>({ action: 'list', door });
  return data.rooms ?? [];
}

export async function roomStats(): Promise<{ people: number; rooms: number }> {
  return call<{ people: number; rooms: number }>({ action: 'stats' });
}

// Whether a trained host is in a support room right now. Never who.
export async function supportStatus(): Promise<{ hostInRoom: boolean; iAmHost: boolean }> {
  return call<{ hostInRoom: boolean; iAmHost: boolean }>({ action: 'support' });
}

// Deletes this person's account and everything tied to it. Can't be undone.
export async function deleteMyAccount(): Promise<void> {
  await call<{ status: string }>({ action: 'delete_account' });
}

export type RoomPreview = { status: 'open'; room: RoomInfo; here: number } | { status: 'ended' };

// What a room link shows before signing up: the title and how many are there. Never who.
export async function previewRoom(roomId: string): Promise<RoomPreview> {
  const data = await call<RoomPreview>({ action: 'preview', roomId });
  return data.status === 'open' ? data : { status: 'ended' };
}
