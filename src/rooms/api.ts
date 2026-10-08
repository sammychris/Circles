import { supabase } from '../lib/supabase';
import type { LearnLevel } from './learn';
import type { Topic } from './start';

export type Door = 'talk' | 'play' | 'support' | 'learn';
export type Mood = 'chat' | 'laugh' | 'advice';

export type RoomInfo = {
  id: string;
  door: Door;
  mood: Mood | null;
  topic?: Topic | null;
  // Learn together: the language or skill, and the level.
  language?: string | null;
  level?: LearnLevel | null;
  title: string;
  capacity: number;
};

export type RoomTicket = { token: string; url: string; roomName: string; room: RoomInfo; isHost: boolean };

// How someone gets into a room: matched through a door, or picked from the Open now list.
export type RoomRequest =
  | { kind: 'match'; door: Door; mood: Mood | null; excludeRoomId?: string; language?: string; level?: LearnLevel }
  // door: where they found the room, so "Find me another room" looks behind the same door.
  | { kind: 'join'; roomId: string; door?: 'talk' | 'play' }
  // Start something: a room with your own title. Invite-only rooms are only opened by their link.
  | {
      kind: 'create';
      door: 'talk' | 'play' | 'learn';
      title: string;
      topic: Topic | null;
      capacity: number;
      private: boolean;
      language?: string;
      level?: LearnLevel;
    };

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

export class RoomEndedError extends Error {
  constructor() {
    super('This room has ended');
  }
}

export class TooManyRoomsError extends Error {
  constructor() {
    super('Too many rooms started');
  }
}

export class BadTitleError extends Error {
  constructor() {
    super('That title can’t be used');
  }
}

export class RemovedError extends Error {
  constructor() {
    super("You can't rejoin this room");
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
    if (payload.status === 'ended') throw new RoomEndedError();
    if (payload.status === 'too_many') throw new TooManyRoomsError();
    if (payload.status === 'removed') throw new RemovedError();
    if (payload.status === 'bad_title') throw new BadTitleError();
    if (status === 409) throw new RoomFullError();
    if (status === 403 && payload.error === 'Your account is paused') throw new PausedError();
    throw new Error(payload.error ?? 'Could not reach the room server');
  }
  return data as T;
}

export async function getTicket(request: RoomRequest): Promise<RoomTicket> {
  const data = await call<Partial<RoomTicket> & { status?: string }>(
    request.kind === 'match'
      ? {
          action: 'match',
          door: request.door,
          mood: request.mood,
          excludeRoomId: request.excludeRoomId,
          language: request.language,
          level: request.level,
        }
      : request.kind === 'create'
        ? {
            action: 'create',
            door: request.door,
            title: request.title,
            topic: request.topic,
            capacity: request.capacity,
            private: request.private,
            language: request.language,
            level: request.level,
          }
        : { action: 'join', roomId: request.roomId },
  );
  if (data.status === 'no_host') throw new NoHostError();
  if (!data.token || !data.url || !data.room) throw new Error('The room ticket was incomplete');
  return data as RoomTicket;
}

export type OpenRoom = {
  id: string;
  title: string;
  mood: Mood | null;
  topic?: Topic | null;
  language?: string | null;
  level?: LearnLevel | null;
  capacity: number;
  here: number;
};

export async function listOpenRooms(door: Door = 'talk'): Promise<OpenRoom[]> {
  const data = await call<{ rooms: OpenRoom[] }>({ action: 'list', door });
  return data.rooms ?? [];
}

export async function roomStats(): Promise<{ people: number; rooms: number }> {
  return call<{ people: number; rooms: number }>({ action: 'stats' });
}

// Raise or lower your hand. The room server sets it, so nobody can change anything else about themselves.
export async function setHandUp(roomId: string, up: boolean): Promise<void> {
  await call<{ status: string }>({ action: 'hand', roomId, up });
}

export type RemovalReason = 'unkind' | 'sexual' | 'spam' | 'off_topic' | 'other';

// Trained hosts only (the room server checks): lower a hand, mute someone, or remove them from the room.
export async function hostAction(roomId: string, personId: string, act: 'lower' | 'mute' | 'remove', reason?: RemovalReason): Promise<void> {
  await call<{ status: string }>({ action: 'host', roomId, personId, act, reason });
}

// "This wasn't fair": one short note about a removal, for the Circles team.
export async function appealRemoval(roomId: string, text: string): Promise<void> {
  const { error } = await supabase.rpc('appeal_removal', { p_room: roomId, p_text: text });
  if (error) throw error;
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
