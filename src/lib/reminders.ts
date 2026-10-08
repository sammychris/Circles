import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { ScheduledRoom } from '../rooms/schedule';
import { registerPush } from './push';

// Reminders on this phone (Remind me, and a weekly group's meetings): the phone itself shows "Ludo
// night starts in 15 minutes", so nothing has to be sent from a server. Tapping it opens the room.
// Scheduled rooms are never support rooms, so a lock-screen reminder never reveals one.
// Kept per account; logging out clears them all.

const BEFORE_MS = 15 * 60_000;
const CHANNEL = 'reminders';
const KEY = (userId: string) => `circles.phoneReminders.${userId}`;
const supported = Platform.OS !== 'web';

// While the app is open, a reminder still shows as a banner.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

// The phone's permission to show reminders. Asked once, the first time someone sets one.
export async function allowReminders(): Promise<boolean> {
  if (!supported) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
    }
    const now = await Notifications.getPermissionsAsync();
    const granted = now.granted || (now.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
    // Allowed: invitation alerts can reach this phone too.
    if (granted) void registerPush();
    return granted;
  } catch {
    return false;
  }
}

async function loadIds(userId: string): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY(userId))) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveIds(userId: string, ids: Record<string, string>) {
  try {
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(ids));
  } catch {
    // Set up again next time.
  }
}

// The end of "Ludo night is set for 8 pm. …": a promise only when the phone will really remind them.
export function reminderNote(allowed: boolean): string {
  if (allowed) return "We'll remind you.";
  return supported ? 'Turn on notifications for Circles to get a reminder.' : '';
}

// Makes this phone's reminders match the rooms it should remind about: the ones you set "Remind me"
// for, and your weekly groups' meetings. Called whenever the lists are loaded. One at a time, so two
// pages loading together never set the same reminder twice (or lose one that then can't be cancelled).
let queue: Promise<void> = Promise.resolve();
export function syncReminders(userId: string, rooms: ScheduledRoom[]): Promise<void> {
  if (!supported) return Promise.resolve();
  queue = queue.then(() => syncNow(userId, rooms));
  return queue;
}

async function syncNow(userId: string, rooms: ScheduledRoom[]): Promise<void> {
  try {
    const granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return;
    const ids = await loadIds(userId);
    const now = Date.now();
    const wanted = rooms.filter((r) => (r.reminded || r.regular) && r.startsAt.getTime() - BEFORE_MS > now);
    const keep = new Set(wanted.map((r) => r.id));
    for (const [roomId, notificationId] of Object.entries(ids)) {
      if (!keep.has(roomId)) {
        await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
        delete ids[roomId];
      }
    }
    for (const r of wanted) {
      if (ids[r.id]) continue;
      ids[r.id] = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${r.title} starts in 15 minutes`,
          body: 'Tap to go in when it opens.',
          data: { scheduledId: r.id, startsAt: r.startsAt.toISOString() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(r.startsAt.getTime() - BEFORE_MS),
          channelId: CHANNEL,
        },
      });
    }
    await saveIds(userId, ids);
  } catch {
    // A reminder that can't be set is only a missed nudge; the room is still listed.
  }
}

// Logging out: no more reminders for that account on this phone.
export function clearReminders(userId: string | null): Promise<void> {
  if (!supported) return Promise.resolve();
  // After any sync already running, so nothing is set again behind it.
  queue = queue.then(() => clearNow(userId));
  return queue;
}

async function clearNow(userId: string | null): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (userId) await AsyncStorage.removeItem(KEY(userId));
  } catch {
    // Nothing else to do.
  }
}

// Tapping a reminder (also when it opened the app): the scheduled room it's about, and when it starts.
// Tapping an invitation alert: Groups, where the invitation is.
export function onReminderTap(open: (scheduledId: string, startsAt: Date | null) => void, onInvitation?: () => void): () => void {
  if (!supported) return () => {};
  const take = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    const at = typeof data?.startsAt === 'string' ? new Date(data.startsAt) : null;
    if (data?.kind === 'invitation') {
      Notifications.clearLastNotificationResponse();
      onInvitation?.();
      return;
    }
    if (typeof data?.scheduledId !== 'string') return;
    // Handled once: logging in again (or as someone else) never reopens it.
    Notifications.clearLastNotificationResponse();
    open(data.scheduledId, at && !isNaN(at.getTime()) ? at : null);
  };
  try {
    take(Notifications.getLastNotificationResponse());
  } catch {
    // Nothing was tapped.
  }
  const sub = Notifications.addNotificationResponseReceivedListener(take);
  return () => sub.remove();
}
