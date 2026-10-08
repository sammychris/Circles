import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { ScheduledRoom } from '../rooms/schedule';

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
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
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

// Makes this phone's reminders match the rooms it should remind about: the ones you set "Remind me"
// for, and your weekly groups' meetings. Called whenever the lists are loaded.
export async function syncReminders(userId: string, rooms: ScheduledRoom[]): Promise<void> {
  if (!supported) return;
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
        content: { title: `${r.title} starts in 15 minutes`, body: 'Tap to go in when it opens.', data: { scheduledId: r.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.startsAt.getTime() - BEFORE_MS), channelId: CHANNEL },
      });
    }
    await saveIds(userId, ids);
  } catch {
    // A reminder that can't be set is only a missed nudge; the room is still listed.
  }
}

// Logging out: no more reminders for that account on this phone.
export async function clearReminders(userId: string | null): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (userId) await AsyncStorage.removeItem(KEY(userId));
  } catch {
    // Nothing else to do.
  }
}

// Tapping a reminder (also when it opened the app): the scheduled room it's about.
export function onReminderTap(open: (scheduledId: string) => void): () => void {
  if (!supported) return () => {};
  const take = (response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.scheduledId;
    if (typeof id === 'string') open(id);
  };
  void Notifications.getLastNotificationResponseAsync().then(take).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(take);
  return () => sub.remove();
}
