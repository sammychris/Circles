import { clockWords, dayAndTime, inWords, weeklyWords } from '../src/lib/when';

const now = new Date(2026, 9, 8, 18, 0); // Thursday 8 Oct, 6 pm

describe('times in plain words', () => {
  it('says the time the Circles way', () => {
    expect(clockWords(new Date(2026, 9, 8, 21, 0))).toBe('9 pm');
    expect(clockWords(new Date(2026, 9, 8, 9, 30))).toBe('9:30 am');
    expect(clockWords(new Date(2026, 9, 8, 0, 5))).toBe('12:05 am');
    expect(clockWords(new Date(2026, 9, 8, 12, 0))).toBe('12 pm');
  });

  it('says the day', () => {
    expect(dayAndTime(new Date(2026, 9, 8, 21, 0), now)).toBe('Tonight at 9 pm');
    expect(dayAndTime(new Date(2026, 9, 8, 15, 0), now)).toBe('Today at 3 pm');
    expect(dayAndTime(new Date(2026, 9, 9, 8, 0), now)).toBe('Tomorrow at 8 am');
    expect(dayAndTime(new Date(2026, 9, 12, 22, 0), now)).toBe('Monday at 10 pm');
    expect(dayAndTime(new Date(2026, 9, 16, 22, 0), now)).toBe('Fri 16 Oct at 10 pm');
  });

  it('says how soon', () => {
    expect(inWords(new Date(2026, 9, 8, 18, 25), now)).toBe('In 25 min');
    expect(inWords(new Date(2026, 9, 8, 20, 0), now)).toBe('In 2 hours');
    expect(inWords(new Date(2026, 9, 8, 17, 30), now)).toBe('Now');
    expect(inWords(new Date(2026, 9, 11, 18, 0), now)).toBe('In 3 days');
  });

  it('says a weekly time', () => {
    expect(weeklyWords([5], '22:00')).toBe('Every Friday at 10 pm');
    expect(weeklyWords([4, 2], '19:00')).toBe('Every Tuesday and Thursday at 7 pm');
    expect(weeklyWords([1, 3, 5], '19:30')).toBe('Every Monday, Wednesday and Friday at 7:30 pm');
    expect(weeklyWords([0, 1, 2, 3, 4, 5, 6], '07:00')).toBe('Every day at 7 am');
    expect(weeklyWords([1, 2, 3, 4, 5], '18:00')).toBe('Every weekday at 6 pm');
  });
});
