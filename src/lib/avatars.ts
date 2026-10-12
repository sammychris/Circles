import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Bird, Cat, Coffee, Fish, Flame, Flower2, Leaf, Moon, Music, Star, Sun, Waves } from 'lucide-react-native';
import { supabase } from './supabase';

// What someone chose to look like (Me › Edit): one of the app's avatar colours, and a symbol instead
// of their initial if they like. Never a photo (docs/me-page-spec.md: anonymity first).
export const SYMBOLS = {
  sun: Sun,
  moon: Moon,
  star: Star,
  leaf: Leaf,
  flower: Flower2,
  waves: Waves,
  flame: Flame,
  music: Music,
  coffee: Coffee,
  cat: Cat,
  bird: Bird,
  fish: Fish,
} as const satisfies Record<string, ComponentType<{ size: number; color: string; strokeWidth: number }>>;
export type AvatarSymbol = keyof typeof SYMBOLS;
export type Look = { tint: number | null; symbol: AvatarSymbol | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Looks already fetched (null: nothing chosen). Avatars on screen ask for theirs, and the asks are
// gathered into one request a moment later, so a room of 10 is one call, not 10.
const known = new Map<string, Look | null>();
const waiting = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

async function fetchWaiting() {
  timer = null;
  const ids = [...waiting].slice(0, 100);
  ids.forEach((id) => waiting.delete(id));
  if (waiting.size > 0) timer = setTimeout(() => void fetchWaiting(), 50);
  try {
    const { data, error } = await supabase.rpc('avatars_of', { p_ids: ids });
    if (error) return; // drawn with the usual colour and initial; asked again next time it's drawn
    const rows = (data ?? []) as { id: string; tint: number | null; symbol: AvatarSymbol | null }[];
    ids.forEach((id) => known.set(id, null));
    rows.forEach((r) => known.set(r.id, r.tint === null && r.symbol === null ? null : { tint: r.tint, symbol: r.symbol }));
    notify();
  } catch {
    // Offline: asked again next time it's drawn.
  }
}

function ask(id: string) {
  if (known.has(id) || waiting.has(id) || !UUID.test(id)) return;
  waiting.add(id);
  if (!timer) timer = setTimeout(() => void fetchWaiting(), 200);
}

// Whether this person's look has been fetched yet.
export function lookKnown(userId: string): boolean {
  return known.has(userId);
}

// shortcut: other people's looks are fetched once per app session; a change shows after a restart.
export function useLook(userId: string): Look | null {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    ask(userId);
    return () => {
      listeners.delete(listener);
    };
  }, [userId]);
  return known.get(userId) ?? null;
}

// After saving your own look: shown everywhere on this phone straight away.
export function rememberLook(userId: string, look: Look) {
  known.set(userId, look);
  notify();
}
