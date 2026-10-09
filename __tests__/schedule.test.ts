import { canGoIn, tonight, type ScheduledRoom } from '../src/rooms/schedule';

jest.mock('../src/lib/supabase', () => ({ supabase: {} }));

const room = (id: string, startsAt: Date): ScheduledRoom => ({
  id,
  groupId: null,
  door: 'play',
  title: id,
  topic: null,
  language: null,
  level: null,
  capacity: 6,
  startsAt,
  private: false,
  hostNickname: 'Ada',
  going: 0,
  reminded: false,
  regular: false,
  mine: false,
});

describe('Explore › Tonight', () => {
  const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

  it('shows the rest of today, and ones already going', () => {
    const list = [room('earlier', at(8, 17)), room('soon', at(8, 20)), room('tomorrow', at(9, 20)), room('over', at(8, 12))];
    expect(tonight(list, at(8, 18)).map((r) => r.id)).toEqual(['earlier', 'soon']);
  });

  it("adds tomorrow's after 9 pm", () => {
    const list = [room('late', at(8, 23)), room('tomorrow', at(9, 20)), room('later', at(10, 20))];
    expect(tonight(list, at(8, 21, 30)).map((r) => r.id)).toEqual(['late', 'tomorrow']);
  });
});

describe('Go in', () => {
  const start = new Date(2026, 9, 8, 20, 0);
  it('opens 5 minutes before and stays open for 2 hours', () => {
    expect(canGoIn(start, start.getTime() - 6 * 60_000)).toBe(false);
    expect(canGoIn(start, start.getTime() - 5 * 60_000)).toBe(true);
    expect(canGoIn(start, start.getTime() + 2 * 60 * 60_000)).toBe(true);
    expect(canGoIn(start, start.getTime() + 2 * 60 * 60_000 + 1)).toBe(false);
  });
});
