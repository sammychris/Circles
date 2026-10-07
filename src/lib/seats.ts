import { ROOM_CAPACITY } from '../config';

export type SeatPoint = { x: number; y: number };

// Seats sit on a ring at 60 degree steps, starting at the top and going clockwise.
// (x, y) is the offset of the seat centre from the centre of the ring.
export function seatPoints(count: number, radius: number): SeatPoint[] {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i * step - 90) * Math.PI) / 180;
    return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
  });
}

// "You" always sits at the bottom seat. Everyone else fills the other seats in the order they joined.
export function assignSeats<T>(me: T | null, others: T[], seatCount = ROOM_CAPACITY): (T | null)[] {
  const seats: (T | null)[] = Array(seatCount).fill(null);
  const bottom = Math.floor(seatCount / 2);
  if (me) seats[bottom] = me;
  let next = 0;
  for (const person of others) {
    while (next < seatCount && seats[next] !== null) next += 1;
    if (next >= seatCount) break;
    seats[next] = person;
  }
  return seats;
}

export function seatsOpenText(here: number, capacity = ROOM_CAPACITY): string {
  const open = Math.max(capacity - here, 0);
  return open === 1 ? '1 seat open' : `${open} seats open`;
}

export function initialOf(nickname: string): string {
  return (nickname.trim()[0] ?? '?').toUpperCase();
}

// Stable pick from the user id, never random per render.
export function tintIndex(userId: string, tints: number): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return hash % tints;
}

export function formatJoinTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} seconds`;
}
