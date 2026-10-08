import { clock, roomPhase, secondsLeft } from '../src/rooms/phase';

const talk = { isSupport: false, hostPresent: false };

describe('roomPhase', () => {
  it('waits for three people before anyone talks', () => {
    expect(roomPhase({ ...talk, count: 1, everLive: false })).toBe('waiting');
    expect(roomPhase({ ...talk, count: 2, everLive: false })).toBe('waiting');
    expect(roomPhase({ ...talk, count: 3, everLive: false })).toBe('live');
  });

  it('starts a countdown when a live room drops to two, and recovers at three', () => {
    expect(roomPhase({ ...talk, count: 2, everLive: true })).toBe('countdown');
    expect(roomPhase({ ...talk, count: 1, everLive: true })).toBe('countdown');
    expect(roomPhase({ ...talk, count: 3, everLive: true })).toBe('live');
  });

  it('never runs a support room without a host', () => {
    expect(roomPhase({ count: 5, everLive: false, isSupport: true, hostPresent: false })).toBe('waiting');
    expect(roomPhase({ count: 5, everLive: true, isSupport: true, hostPresent: false })).toBe('countdown');
    expect(roomPhase({ count: 3, everLive: false, isSupport: true, hostPresent: true })).toBe('live');
  });
});

describe('countdown', () => {
  it('counts down two minutes and stops at zero', () => {
    expect(secondsLeft(0, 0)).toBe(120);
    expect(secondsLeft(0, 18_500)).toBe(102);
    expect(secondsLeft(0, 500_000)).toBe(0);
  });

  it('shows minutes and seconds', () => {
    expect(clock(102)).toBe('1:42');
    expect(clock(9)).toBe('0:09');
  });
});
