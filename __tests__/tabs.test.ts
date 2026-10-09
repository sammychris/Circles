import { forYou, forgetVisits, goBackRoom, loadVisits, rememberVisit, type Visit } from '../src/lib/roomHistory';
import { matchesFilter, sortLive } from '../src/rooms/explore';
import type { ListedRoom, RoomInfo } from '../src/rooms/api';

jest.mock('../src/rooms/moods', () => ({
  MOOD_STYLE: { chat: { label: 'Just chat' }, laugh: { label: 'Want to laugh' }, advice: { label: 'Need advice' } },
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const room = (id: string, door: ListedRoom['door'], here: number, extra: Partial<ListedRoom> = {}): ListedRoom => ({
  id,
  door,
  title: id,
  mood: null,
  capacity: 6,
  here,
  ...extra,
});
const visit = (id: string, door: Visit['door'], leftAt: number, extra: Partial<Visit> = {}): Visit => ({
  id,
  door,
  title: id,
  mood: null,
  topic: null,
  language: null,
  level: null,
  leftAt,
  ...extra,
});
const NOW = new Date(2026, 9, 8, 21, 0).getTime();

describe('Explore', () => {
  it('lists rooms with free seats first, then the busiest', () => {
    const sorted = sortLive([room('a', 'talk', 2), room('full', 'talk', 6), room('b', 'play', 4)]);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a', 'full']);
  });

  it('filters by door or topic', () => {
    expect(matchesFilter(room('a', 'play', 1), 'play')).toBe(true);
    expect(matchesFilter(room('a', 'talk', 1, { topic: 'football' }), 'topic:football')).toBe(true);
    expect(matchesFilter(room('a', 'talk', 1), 'learn')).toBe(false);
  });
});

describe('Home: Go back in and For you', () => {
  it('offers the room you left within the hour, while it is still open', () => {
    const visits = [visit('r1', 'talk', NOW - 20 * 60_000)];
    expect(goBackRoom(visits, [room('r1', 'talk', 3)], NOW)?.id).toBe('r1');
    expect(goBackRoom([visit('r1', 'talk', NOW - 2 * 3_600_000)], [room('r1', 'talk', 3)], NOW)).toBeNull();
    expect(goBackRoom(visits, [], NOW)).toBeNull();
  });

  it('suggests up to two rooms like ones you joined, with the reason', () => {
    const visits = [
      visit('old', 'learn', NOW - 86_400_000, { language: 'igbo', level: 'beginner' }),
      visit('t', 'talk', NOW - 3_600_000, { mood: 'laugh' }),
    ];
    const open = [
      room('l1', 'learn', 2, { language: 'igbo', level: 'beginner' }),
      room('l2', 'learn', 2, { language: 'igbo', level: 'fluent' }),
      room('m1', 'talk', 3, { mood: 'laugh' }),
      room('m2', 'talk', 3, { mood: 'laugh' }),
    ];
    const picks = forYou(visits, open, null, NOW);
    expect(picks.map((p) => [p.room.id, p.reason])).toEqual([
      ['l1', 'Igbo, Beginner, like you'],
      ['m1', 'Want to laugh, like your room today'],
    ]);
  });

  it('never suggests the Go back in room or a full one', () => {
    const visits = [visit('t', 'talk', NOW, { mood: 'chat' })];
    const picks = forYou(visits, [room('back', 'talk', 2, { mood: 'chat' }), room('full', 'talk', 6, { mood: 'chat' })], 'back', NOW);
    expect(picks).toEqual([]);
  });
});

describe('room history stays private and never holds support rooms', () => {
  const info = (id: string, door: RoomInfo['door']): RoomInfo => ({ id, door, mood: null, title: id, capacity: 6 });

  it('never keeps a support room', async () => {
    await rememberVisit('me', info('s1', 'support'));
    await rememberVisit('me', info('t1', 'talk'));
    expect((await loadVisits('me')).map((v) => v.id)).toEqual(['t1']);
  });

  it('keeps each person separate, and forgets on log out', async () => {
    await rememberVisit('me', info('t2', 'talk'));
    expect(await loadVisits('someone-else')).toEqual([]);
    await forgetVisits('me');
    expect(await loadVisits('me')).toEqual([]);
  });
});
