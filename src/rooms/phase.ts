import { rules } from '../theme/tokens';

// Where a room is in its life (CIRCLES_ARCHITECTURE.md › Room rules):
// - waiting:   fewer people than the room needs, and it hasn't started yet. Mics stay off.
// - live:      enough people (and, in support rooms, a trained host). Everyone can talk.
// - countdown: it was live and dropped below the minimum (or the support host left). Mics pause;
//              if nobody arrives before the countdown ends, the room closes.
// Support rooms need 3, so someone who is down is never alone with one stranger. Every other
// room goes live at 2 (Sammy's decision, 2026-10-08).
export type RoomPhase = 'waiting' | 'live' | 'countdown';

export type PhaseInput = {
  count: number;
  everLive: boolean;
  isSupport: boolean;
  hostPresent: boolean;
};

export function minPeopleFor(isSupport: boolean): number {
  return isSupport ? rules.supportMinPeople : rules.roomMinPeople;
}

export function roomPhase({ count, everLive, isSupport, hostPresent }: PhaseInput): RoomPhase {
  const enoughPeople = count >= minPeopleFor(isSupport);
  const hosted = !isSupport || hostPresent;
  if (enoughPeople && hosted) return 'live';
  return everLive ? 'countdown' : 'waiting';
}

// Seconds left in a countdown that started at `startedAt` (ms). Never below zero.
export function secondsLeft(startedAt: number, now: number, total = rules.roomDropWaitSeconds): number {
  return Math.min(total, Math.max(0, total - Math.floor((now - startedAt) / 1000)));
}

// "1:42"
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
