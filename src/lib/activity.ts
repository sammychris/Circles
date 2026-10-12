import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { myInvitations, type Invitation } from '../rooms/invitations';
import { hostRequests, myHostStatus, type HostRequest } from '../support/api';

// The bell on Home (Activity): invitations, one-on-one requests for hosts, and new friends, in one
// place. Never who saved you: only a friendship both people made (CLAUDE.md, Never list).

export type NewFriend = { personId: string; nickname: string; since: Date };
export type Activity = { invitations: Invitation[]; requests: HostRequest[]; friends: NewFriend[] };

// New friends from the last two weeks are listed.
const FRIENDS_DAYS = 14;
const SEEN = (userId: string) => `circles.activitySeen.${userId}`;

export async function loadActivity(): Promise<Activity> {
  const since = new Date(Date.now() - FRIENDS_DAYS * 24 * 60 * 60_000).toISOString();
  const [invitations, friendRows, host] = await Promise.all([
    myInvitations().catch(() => [] as Invitation[]),
    supabase.rpc('my_new_friends', { p_since: since }),
    myHostStatus().catch(() => null),
  ]);
  // Offline: say so, rather than "Nothing new".
  if (friendRows.error) throw friendRows.error;
  const requests = host?.isHost ? await hostRequests().catch(() => [] as HostRequest[]) : [];
  const friends = ((friendRows.data ?? []) as { person_id: string; nickname: string; since: string }[]).map((r) => ({
    personId: r.person_id,
    nickname: r.nickname,
    since: new Date(r.since),
  }));
  return { invitations, requests, friends };
}

async function seenAt(userId: string): Promise<number> {
  try {
    return Number((await AsyncStorage.getItem(SEEN(userId))) ?? 0);
  } catch {
    return 0;
  }
}

// Opening Activity: what it showed counts as seen. The newest item's own (server) time is kept, not
// the phone's clock, so a phone set wrong never hides or repeats the dot.
export async function markActivitySeen(userId: string, a: Activity): Promise<void> {
  const newest = Math.max(
    0,
    ...a.invitations.map((i) => i.createdAt.getTime()),
    ...a.requests.map((r) => Date.parse(r.createdAt)),
    ...a.friends.map((f) => f.since.getTime()),
  );
  try {
    if (newest > (await seenAt(userId))) await AsyncStorage.setItem(SEEN(userId), String(newest));
  } catch {
    // The dot comes back next time; nothing is lost.
  }
}

export function unreadCount(a: Activity, seen: number): number {
  return (
    a.invitations.filter((i) => i.createdAt.getTime() > seen).length +
    a.requests.filter((r) => Date.parse(r.createdAt) > seen).length +
    a.friends.filter((f) => f.since.getTime() > seen).length
  );
}

// How many new things since Activity was last opened, checked every minute while Home is open.
export function useUnreadActivity(userId: string): number {
  const [count, setCount] = useState(0);
  const check = useCallback(async () => {
    try {
      const [a, seen] = await Promise.all([loadActivity(), seenAt(userId)]);
      setCount(unreadCount(a, seen));
    } catch {
      // Checked again in a minute.
    }
  }, [userId]);
  useEffect(() => {
    void check();
    const timer = setInterval(() => void check(), 60_000);
    return () => clearInterval(timer);
  }, [check]);
  return count;
}
