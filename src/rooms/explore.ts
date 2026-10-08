import type { ListedRoom } from './api';

// Explore's filter: All, a door, or a topic ("topic:football").
export type Filter = 'all' | 'talk' | 'play' | 'learn' | string;

// Free seats first, then the most people talking, then the newest (the order the server sends).
export function sortLive(rooms: ListedRoom[]): ListedRoom[] {
  return rooms
    .map((r, i) => ({ r, i }))
    .sort((a, b) => Number(a.r.here >= a.r.capacity) - Number(b.r.here >= b.r.capacity) || b.r.here - a.r.here || a.i - b.i)
    .map(({ r }) => r);
}

export function matchesFilter(room: ListedRoom, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter.startsWith('topic:')) return room.topic === filter.slice('topic:'.length);
  return room.door === filter;
}
