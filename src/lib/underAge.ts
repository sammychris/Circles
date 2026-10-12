import AsyncStorage from '@react-native-async-storage/async-storage';

// Someone answered under 18 on this phone: rooms stay closed on it until their 18th birthday, whichever
// account is logged in, so a new account can't just try another date (docs/design/pages/age-check.md).
// shortcut: self-declared and per phone; phone checks can make it stronger later.
const KEY = 'circles.under18Until';

export async function underAgeUntil(): Promise<number> {
  try {
    return Number((await AsyncStorage.getItem(KEY)) ?? 0);
  } catch {
    return 0;
  }
}

export async function rememberUnderAge(dateOfBirth: string): Promise<void> {
  const eighteen = new Date(dateOfBirth);
  eighteen.setFullYear(eighteen.getFullYear() + 18);
  try {
    await AsyncStorage.setItem(KEY, String(eighteen.getTime()));
  } catch {
    // The server still keeps this account out of rooms.
  }
}
