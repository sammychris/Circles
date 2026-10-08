import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ListedRoom, RoomInfo } from '../rooms/api';
import { MOOD_STYLE } from '../rooms/moods';
import { levelLabel, subjectById } from '../rooms/learn';
import { topicLabel } from '../rooms/start';

// Your last few rooms, kept on this phone only, for Home's "Go back in" and "For you"
// (docs/design/pages/tabs.md › Home). Support rooms are never kept and never suggested (CLAUDE.md,
// Never list). Nothing here leaves the phone.

const KEY = 'circles.rooms';
const KEEP = 5;
// "Go back in": a room you left in the last hour that's still open.
export const GO_BACK_MS = 60 * 60 * 1000;

export type Visit = Pick<RoomInfo, 'id' | 'door' | 'mood' | 'topic' | 'language' | 'level' | 'title'> & { leftAt: number };

export async function loadVisits(): Promise<Visit[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Visit[]) : [];
    return Array.isArray(list) ? list.filter((v) => v && typeof v.id === 'string' && v.door !== 'support') : [];
  } catch {
    return [];
  }
}

// After leaving a room. Support rooms are never written down.
export async function rememberVisit(room: RoomInfo, leftAt = Date.now()): Promise<void> {
  if (room.door === 'support') return;
  const visit: Visit = {
    id: room.id,
    door: room.door,
    mood: room.mood,
    topic: room.topic ?? null,
    language: room.language ?? null,
    level: room.level ?? null,
    title: room.title,
    leftAt,
  };
  const list = [visit, ...(await loadVisits()).filter((v) => v.id !== room.id)].slice(0, KEEP);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Only a suggestion is lost.
  }
}

// The room to go back into: the most recent one you left within the hour, if it's still open.
export function goBackRoom(visits: Visit[], open: ListedRoom[], now = Date.now()): ListedRoom | null {
  const recent = visits.find((v) => now - v.leftAt <= GO_BACK_MS);
  if (!recent) return null;
  return open.find((r) => r.id === recent.id && r.here > 0 && r.here < r.capacity) ?? null;
}

function when(at: number, now: number): string {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : 'recently';
}

// "For you": up to 2 open rooms like ones you joined before (same door and mood, topic, or language
// and level), each with the reason. Never the room in "Go back in", never a full room.
export function forYou(visits: Visit[], open: ListedRoom[], skip: string | null, now = Date.now()): { room: ListedRoom; reason: string }[] {
  const picks: { room: ListedRoom; reason: string }[] = [];
  for (const v of visits) {
    for (const r of open) {
      if (picks.length >= 2) return picks;
      if (r.id === skip || r.id === v.id || r.here >= r.capacity || picks.some((p) => p.room.id === r.id)) continue;
      if (r.door !== v.door) continue;
      if (v.door === 'learn') {
        if (!v.language || r.language !== v.language || r.level !== v.level) continue;
        const subject = subjectById(v.language)?.name ?? 'Practice';
        const level = levelLabel(v.level);
        picks.push({ room: r, reason: `${subject}${level ? `, ${level}` : ''}, like you` });
      } else if (v.topic && r.topic === v.topic) {
        picks.push({ room: r, reason: `${topicLabel(v.topic)}, like your room ${when(v.leftAt, now)}` });
      } else if (v.mood && r.mood === v.mood) {
        picks.push({ room: r, reason: `${MOOD_STYLE[v.mood].label}, like your room ${when(v.leftAt, now)}` });
      } else if (v.door === 'play' && !v.topic && !v.mood) {
        picks.push({ room: r, reason: `A game room, like yours ${when(v.leftAt, now)}` });
      }
    }
  }
  return picks;
}
