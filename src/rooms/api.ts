import { supabase } from '../lib/supabase';
import type { GameId } from '../games/tableGame';
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
  // A private one-on-one with a host (support), and when its time is up.
  oneOnOne?: boolean;
  endsAt?: string | null;
};

export type RoomTicket = { token: string; url: string; roomName: string; room: RoomInfo; isHost: boolean };

// How someone gets into a room: matched through a door, or picked from the Open now list.
export type RoomRequest =
  // game: tapped on Let's play. Stays on this phone (never sent); the room starts it once it can.
  | { kind: 'match'; door: Door; mood: Mood | null; excludeRoomId?: string; language?: string; level?: LearnLevel; game?: GameId | 'ludo' | 'impostor' }
  // door: where they found the room, so "Find me another room" looks behind the same door.
  // oneOnOneId: the request behind a one-on-one, kept on this phone for "How was it?" afterwards.
  | { kind: 'join'; roomId: string; door?: 'talk' | 'play'; oneOnOneId?: string }
  // A scheduled room or a weekly group's meeting: open from 5 minutes before its time.
  | { kind: 'scheduled'; scheduledId: string }
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
    super('That title canâ€™t be used');
  }
}

export class RemovedError extends Error {
  // Why the host removed them, from the room server.
  reason: string | null;
  constructor(reason: string | null = null) {
    super("You can't rejoin this room");
    this.reason = reason;
  }
}

// A scheduled room that doesn't open until 5 minutes before its time.
export class NotYetError extends Error {
  startsAt: string | null;
  constructor(startsAt: string | null = null) {
    super('Not open yet');
    this.startsAt = startsAt;
  }
}

// No 18+ answer yet (or under 18): rooms and anything that leads to one need it.
export class AdultsOnlyError extends Error {
  constructor() {
    super('adults_only');
  }
}

export class PausedError extends Error {
  constructor() {
    super('Your account is paused');
  }
}

export async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('livekit-token', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const status = context?.status;
    let payload: { status?: string; error?: string; reason?: string | null; startsAt?: string } = {};
    try {
      payload = (await context?.json()) ?? {};
    } catch {
      // not JSON
    }
    if (payload.status === 'no_host') throw new NoHostError();
    if (payload.status === 'not_yet') throw new NotYetError(payload.startsAt ?? null);
    if (payload.status === 'ended') throw new RoomEndedError();
    if (payload.status === 'too_many') throw new TooManyRoomsError();
    if (payload.status === 'removed') throw new RemovedError(payload.reason ?? null);
    if (payload.status === 'bad_title') throw new BadTitleError();
    if (status === 409) throw new RoomFullError();
    if (status === 403 && payload.error === 'Your account is paused') throw new PausedError();
    if (status === 403 && payload.error === 'Circles is for adults') throw new AdultsOnlyError();
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
        : request.kind === 'scheduled'
          ? { action: 'go_in', scheduledId: request.scheduledId }
          : { action: 'join', roomId: request.roomId },
  );
  if (data.status === 'no_host') throw new NoHostError();
  if (!data.token || !data.url || !data.room) throw new Error('The room ticket was incomplete');
  return data as RoomTicket;
}

// Start something â€º Later or Every week: sets a room for a time, or a weekly group.
export type ScheduleRequest = {
  door: 'talk' | 'play' | 'learn';
  title: string;
  topic: Topic | null;
  capacity: number;
  // Invite only: not listed; people you invite can see it and come.
  private?: boolean;
  language?: string;
  level?: LearnLevel;
} & ({ startsAt: string } | { weekly: { days: number[]; time: string; timeZone: string } });

export async function scheduleRoom(request: ScheduleRequest): Promise<{ scheduledId?: string; groupId?: string; startsAt?: string }> {
  return call<{ scheduledId?: string; groupId?: string; startsAt?: string }>({ action: 'schedule', ...request });
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

// Open rooms behind several doors at once, each marked with its door (Explore, Home's For you).
// Support rooms are never listed (the room server returns none).
export type ListedRoom = OpenRoom & { door: Exclude<Door, 'support'> };
export async function listOpenRoomsAt(doors: Exclude<Door, 'support'>[]): Promise<ListedRoom[]> {
  const lists = await Promise.all(doors.map(async (door) => (await listOpenRooms(door)).map((r) => ({ ...r, door }))));
  return lists.flat();
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
export async function hostAction(roomId: string, personId: string, act: 'lower' | 'mute' | 'remove' | 'escalate', reason?: RemovalReason): Promise<void> {
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

// Live support rooms: title, the host's nickname and badge, and how many are in (never who).
export type SupportRoom = { id: string; title: string; here: number; capacity: number; host: string; hostKind: 'listener' | 'professional' };
export async function listSupportRooms(): Promise<SupportRoom[]> {
  const data = await call<{ rooms: SupportRoom[] }>({ action: 'support_rooms' });
  return data.rooms ?? [];
}

// Deletes this person's account and everything tied to it. Can't be undone.
export async function deleteMyAccount(): Promise<void> {
  await call<{ status: string }>({ action: 'delete_account' });
}

type Tokens = { access_token: string; refresh_token: string };

async function keepSignIn(tokens: Tokens) {
  const { error } = await supabase.auth.setSession(tokens);
  if (error) throw error;
}

// Nickname and password. 'ok' means signed in on this phone; App moves on by itself.
export async function logIn(nickname: string, password: string): Promise<'ok' | 'wrong' | 'locked'> {
  const data = await call<{ status: 'ok' | 'wrong' | 'locked' } & Tokens>({ action: 'login', nickname, password });
  if (data.status === 'ok') await keepSignIn(data);
  return data.status;
}

// Sign up: a nickname and a password, made in one step by the room server (before signing in).
export type SignUpResult = 'ok' | 'taken' | 'reserved' | 'bad_nickname' | 'bad_password' | 'too_many';
export async function signUp(nickname: string, password: string): Promise<SignUpResult> {
  const data = await call<{ status: SignUpResult | 'made_log_in' } & Tokens>({ action: 'signup', nickname, password });
  if (data.status === 'ok') await keepSignIn(data);
  // The account was made but its sign-in hit a limit: log in with it the usual way.
  if (data.status === 'made_log_in') return (await logIn(nickname, password)) === 'ok' ? 'ok' : 'too_many';
  return data.status;
}

// A new password signs the account out everywhere, so the room server sends a fresh sign-in for this phone.
export async function setPassword(password: string): Promise<void> {
  await keepSignIn(await call<Tokens>({ action: 'set_password', password }));
}

export type RoomPreview = { status: 'open'; room: RoomInfo; here: number } | { status: 'ended' };

// What a room link shows before signing up: the title and how many are there. Never who.
export async function previewRoom(roomId: string): Promise<RoomPreview> {
  const data = await call<RoomPreview>({ action: 'preview', roomId });
  return data.status === 'open' ? data : { status: 'ended' };
}

// Invite people who saved each other with you to the room you're in, a scheduled room, or a group.
// Anyone who isn't a mutual save is skipped without saying, so nobody learns who saved whom.
export type InviteTarget = { roomId: string } | { scheduledId: string } | { groupId: string };
export async function sendInvitations(to: string[], target: InviteTarget): Promise<void> {
  await call<{ status: string }>({ action: 'invite', to, ...target });
}
