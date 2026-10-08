import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Invitations to you (docs/design/pages/tabs.md › Groups › Invitations): "Ada_K invited you to Ludo
// night". Only from people who saved each other with you, never from a support room. Only the
// sender's nickname is shown, never who else was invited.

export type Invitation = {
  id: string;
  fromNickname: string;
  kind: 'room' | 'scheduled' | 'group';
  title: string;
  door: 'talk' | 'play' | 'learn';
  roomId: string | null;
  scheduledId: string | null;
  groupId: string | null;
  startsAt: Date | null;
  createdAt: Date;
};

type Row = Record<string, unknown>;

export async function myInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.rpc('my_invitations');
  if (error) throw error;
  return ((data as Row[]) ?? []).map((r) => ({
    id: r.id as string,
    fromNickname: (r.from_nickname as string | null) ?? 'Someone',
    kind: r.kind as Invitation['kind'],
    title: (r.title as string | null) ?? 'a room',
    door: (r.door as Invitation['door']) ?? 'talk',
    roomId: (r.room_id as string | null) ?? null,
    scheduledId: (r.scheduled_id as string | null) ?? null,
    groupId: (r.group_id as string | null) ?? null,
    startsAt: r.starts_at ? new Date(r.starts_at as string) : null,
    createdAt: new Date(r.created_at as string),
  }));
}

// "Not now", or after using it.
export async function dismissInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('dismiss_invitation', { p_id: id });
  if (error) throw error;
}

// The Groups tab's dot: is there an invitation newer than the last time Groups was opened? Kept on
// this phone, per account.
const SEEN_KEY = (userId: string) => `circles.invitesSeen.${userId}`;

export async function hasNewInvitations(userId: string, list: Invitation[]): Promise<boolean> {
  if (list.length === 0) return false;
  try {
    const seen = Number((await AsyncStorage.getItem(SEEN_KEY(userId))) ?? 0);
    return list.some((i) => i.createdAt.getTime() > seen);
  } catch {
    return false;
  }
}

export async function markInvitationsSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY(userId), String(Date.now()));
  } catch {
    // The dot shows once more; nothing else.
  }
}

export async function forgetInvitationsSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_KEY(userId));
  } catch {
    // Nothing else to do.
  }
}
