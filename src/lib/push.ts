import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Alerts on the lock screen ("Ada_K invited you to Ludo night"), sent by the room server through
// Expo's push service. This phone's address (an Expo push token) is saved for whoever is signed in,
// only once they've allowed notifications; Circles never asks just for this on its own.
// Never about a support room (they can't be invited to).

const KEY = 'circles.pushToken';
const CHANNEL = 'invitations';
const supported = Platform.OS !== 'web';

// Saves this phone's address if notifications are allowed. Quietly does nothing otherwise, or when
// Firebase isn't set up in this build yet.
export async function registerPush(): Promise<void> {
  if (!supported) return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Invitations',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    const { error } = await supabase.rpc('save_push_token', { p_token: token });
    if (error) return;
    await AsyncStorage.setItem(KEY, token);
  } catch {
    // No alerts on this phone for now; invitations still show in Groups.
  }
}

// "Turn on alerts": the phone's own question, then the address is saved.
export async function turnOnAlerts(): Promise<boolean> {
  if (!supported) return false;
  try {
    const now = await Notifications.getPermissionsAsync();
    const granted = now.granted || (now.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
    if (granted) await registerPush();
    return granted;
  } catch {
    return false;
  }
}

export async function alertsAllowed(): Promise<boolean> {
  if (!supported) return true;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

// Logging out: this phone stops getting that account's alerts. Runs while still signed in.
export async function forgetPush(): Promise<void> {
  if (!supported) return;
  try {
    const token = await AsyncStorage.getItem(KEY);
    if (token) await supabase.rpc('forget_push_token', { p_token: token });
    await AsyncStorage.removeItem(KEY);
  } catch {
    // The next account to sign in on this phone takes the address over anyway.
  }
}
