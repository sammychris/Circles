import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

export const supabase = createClient(SUPABASE_URL || 'http://missing', SUPABASE_ANON_KEY || 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Coming back to the app: renew the sign-in straight away (phones pause timers in the background), so
// you're still signed in instead of on the Welcome screen. It's never stopped in the background,
// because a room keeps running there.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
  });
}
