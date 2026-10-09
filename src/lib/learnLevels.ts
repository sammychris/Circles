import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearnLevel } from '../rooms/learn';

// Your level in each language or skill, and the last one you practised. Kept on this phone only.
const KEY = 'circles.learn';

type Saved = { levels: Record<string, LearnLevel>; last: string | null };

export async function loadLearn(): Promise<Saved> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    return { levels: parsed.levels ?? {}, last: parsed.last ?? null };
  } catch {
    return { levels: {}, last: null };
  }
}

export async function saveLevel(subject: string, level: LearnLevel): Promise<void> {
  const saved = await loadLearn();
  saved.levels[subject] = level;
  saved.last = subject;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Asked again next time.
  }
}
