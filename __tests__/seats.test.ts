import { assignSeats, formatJoinTime, initialOf, seatPoints, seatsOpenText, tintIndex } from '../src/lib/seats';

describe('seatPoints', () => {
  it('puts the first seat at the top and goes clockwise', () => {
    const points = seatPoints(6, 124);
    expect(points[0]).toEqual({ x: 0, y: -124 });
    expect(points[3]).toEqual({ x: 0, y: 124 });
    expect(points[1].x).toBeGreaterThan(0);
    expect(points[5].x).toBeLessThan(0);
  });

  it('keeps every seat on the ring', () => {
    for (const p of seatPoints(6, 124)) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(124, 0);
    }
  });
});

describe('assignSeats', () => {
  it('seats "you" at the bottom and fills the others from the top', () => {
    const seats = assignSeats('me', ['a', 'b', 'c'], 6);
    expect(seats).toEqual(['a', 'b', 'c', 'me', null, null]);
  });

  it('skips the bottom seat when it is taken', () => {
    const seats = assignSeats('me', ['a', 'b', 'c', 'd', 'e'], 6);
    expect(seats).toEqual(['a', 'b', 'c', 'me', 'd', 'e']);
  });

  it('works before you have joined', () => {
    expect(assignSeats<string>(null, ['a'], 6)).toEqual(['a', null, null, null, null, null]);
  });

  it('never seats more people than there are seats', () => {
    const seats = assignSeats('me', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 6);
    expect(seats.filter(Boolean)).toHaveLength(6);
  });
});

describe('wording', () => {
  it('says seats open like a person would', () => {
    expect(seatsOpenText(6, 6)).toBe('0 seats open');
    expect(seatsOpenText(5, 6)).toBe('1 seat open');
    expect(seatsOpenText(2, 6)).toBe('4 seats open');
    expect(seatsOpenText(9, 6)).toBe('0 seats open');
  });

  it('formats join times', () => {
    expect(formatJoinTime(640)).toBe('640 ms');
    expect(formatJoinTime(1830)).toBe('1.8 seconds');
  });

  it('uses the first letter of the nickname', () => {
    expect(initialOf('ada_K')).toBe('A');
    expect(initialOf('  tolu')).toBe('T');
    expect(initialOf('')).toBe('?');
  });
});

describe('tintIndex', () => {
  it('is stable for the same person and always in range', () => {
    expect(tintIndex('user-123', 6)).toBe(tintIndex('user-123', 6));
    for (const id of ['a', 'bb', 'a-very-long-user-id-0000']) {
      const i = tintIndex(id, 6);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(6);
    }
  });
});
