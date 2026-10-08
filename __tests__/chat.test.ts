import { CHAT_MAX, cleanChat, decodeChat, encodeChat, tooFast, tooFastFrom, utf8Decode, utf8Encode } from '../src/rooms/chat';

describe('room chat', () => {
  it('cleans messages', () => {
    expect(cleanChat('  hi  ')).toBe('hi');
    expect(cleanChat('a‮b\u0007c')).toBe('abc');
    expect(cleanChat('x'.repeat(500))).toHaveLength(CHAT_MAX);
    expect(cleanChat('one\n\n\n\n\ntwo')).toBe('one\n\ntwo');
    expect(cleanChat('   ')).toBe('');
  });

  it('round-trips a message, emoji included', () => {
    expect(decodeChat(encodeChat('How far? 😄'))).toBe('How far? 😄');
  });

  it('encodes text exactly like the standard UTF-8 encoder', () => {
    for (const text of ['hello', 'Ọmọ', 'naïve café', 'How far? 😄🔥', '']) {
      expect(Array.from(utf8Encode(text))).toEqual(Array.from(new TextEncoder().encode(text)));
      expect(utf8Decode(new TextEncoder().encode(text))).toBe(text);
    }
  });

  it('ignores anything that is not a chat message', () => {
    expect(decodeChat(new TextEncoder().encode('not json'))).toBeNull();
    expect(decodeChat(new TextEncoder().encode('{"text": 5}'))).toBeNull();
    expect(decodeChat(new TextEncoder().encode('{"text": "   "}'))).toBeNull();
  });

  it('slows down someone sending too fast', () => {
    const now = 100_000;
    expect(tooFast([now - 1000, now - 2000, now - 3000, now - 4000], now)).toBe(false);
    expect(tooFast([now - 1000, now - 2000, now - 3000, now - 4000, now - 5000], now)).toBe(true);
    expect(tooFast([now - 20_000, now - 21_000, now - 22_000, now - 23_000, now - 24_000], now)).toBe(false);
  });

  it('removes hidden reordering characters and limits line breaks', () => {
    expect(cleanChat('a\u2066b\u2069c\uFEFFd\u2060e')).toBe('abcde');
    expect(cleanChat('1\n2\n3\n4\n5\n6').split('\n')).toHaveLength(4);
    expect(Array.from(cleanChat('😄'.repeat(400)))).toHaveLength(CHAT_MAX);
    expect(cleanChat('😄'.repeat(400)).endsWith('😄')).toBe(true);
  });

  it('drops a flood from someone else, but allows normal bunching', () => {
    const now = 100_000;
    expect(tooFastFrom([now - 1, now - 2, now - 3, now - 4, now - 5, now - 6], now)).toBe(false);
    expect(tooFastFrom(Array.from({ length: 10 }, (_, i) => now - i), now)).toBe(true);
    expect(tooFastFrom(Array.from({ length: 10 }, (_, i) => now - 20_000 - i), now)).toBe(false);
  });
});
