import notifee, { AndroidForegroundServiceType, AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';

const CHANNEL_ID = 'circles-room';
const NOTIFICATION_ID = 'circles-in-a-room';

// Must run once when the app starts (see index.ts). The service stays alive until stopForegroundService().
export function registerForegroundService() {
  notifee.registerForegroundService(() => new Promise<void>(() => {}));
}

// Talking needs the microphone type. Listening only uses the media type, which needs no mic permission.
// The text never names the room: a support room must never show on a lock screen (CLAUDE.md, Never list).
export async function startRoomService(_roomTitle: string, canTalk: boolean) {
  if (Platform.OS !== 'android') return;
  const channelId = await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Circles room',
    importance: AndroidImportance.LOW,
  });
  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: 'Circles',
    body: "You're in a room. Voice stays on.",
    android: {
      // On a locked screen Android shows only "Circles", never the text.
      visibility: AndroidVisibility.PRIVATE,
      channelId,
      asForegroundService: true,
      ongoing: true,
      smallIcon: 'ic_launcher',
      foregroundServiceTypes: [
        canTalk
          ? AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE
          : AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      ],
      pressAction: { id: 'default' },
    },
  });
}

export async function stopRoomService() {
  if (Platform.OS !== 'android') return;
  await notifee.stopForegroundService();
  await notifee.cancelNotification(NOTIFICATION_ID);
}

export async function micPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
}

export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// Android 13+ needs permission to show the "You're in a room" notification.
export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.requestPermission();
}
