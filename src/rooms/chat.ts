// Room chat: short text messages between the people in a room, carried by LiveKit. Never stored:
// when you leave the room, the chat is gone (and the Privacy Policy says so).

export const CHAT_MAX = 300;
export const CHAT_TOPIC = 'chat';
// At most this many messages in this many seconds from one phone.
export const CHAT_BURST = 5;
export const CHAT_WINDOW_MS = 10_000;
// Only the latest messages are kept on screen.
export const CHAT_KEEP = 200;

export type ChatMessage = { id: string; from: string; nickname: string; text: string; at: number; mine: boolean };

// Trims, removes invisible control characters and limits the length. Empty means "don't send".
// At most this many line breaks in one message, so nobody can fill the whole chat with one.
export const CHAT_MAX_LINES = 4;

// Invisible characters that can hide or reorder text: controls, zero-width marks, bidi overrides and isolates.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

// Trims, removes invisible characters and limits the length. Empty means "don't send".
export function cleanChat(text: string): string {
  let lines = 0;
  const clean = text
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/\n/g, () => (++lines < CHAT_MAX_LINES ? '\n' : ' '))
    .trim();
  // Counted in characters, not code units, so an emoji is never cut in half.
  return Array.from(clean).slice(0, CHAT_MAX).join('').trim();
}

// Our own UTF-8 encoding, so chat doesn't depend on TextEncoder/TextDecoder being on every phone.
export function utf8Encode(str: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = [];
  for (const ch of str) {
    let c = ch.codePointAt(0) as number;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      c = Math.min(c, 0x10ffff);
      bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return new Uint8Array(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let c: number;
    if (b < 0x80) {
      c = b;
      i += 1;
    } else if (b >> 5 === 6) {
      c = ((b & 31) << 6) | (bytes[i + 1] & 63);
      i += 2;
    } else if (b >> 4 === 14) {
      c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
      i += 3;
    } else {
      c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      i += 4;
    }
    out += String.fromCodePoint(Number.isFinite(c) && c <= 0x10ffff ? c : 0xfffd);
  }
  return out;
}

export function encodeChat(text: string): Uint8Array<ArrayBuffer> {
  return utf8Encode(JSON.stringify({ text }));
}

// Anything that isn't a proper chat message is ignored.
export function decodeChat(payload: Uint8Array): string | null {
  try {
    const parsed = JSON.parse(utf8Decode(payload)) as { text?: unknown };
    if (typeof parsed.text !== 'string') return null;
    const text = cleanChat(parsed.text);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

// True when sending now would be too fast. `sentAt` are this phone's recent send times.
export function tooFast(sentAt: number[], now: number): boolean {
  return sentAt.filter((t) => now - t < CHAT_WINDOW_MS).length >= CHAT_BURST;
}

// Messages arriving from someone else. Allows twice the sending pace, because the network can bunch
// messages up; anything faster comes from a changed app and is dropped.
export function tooFastFrom(heardAt: number[], now: number): boolean {
  return heardAt.filter((t) => now - t < CHAT_WINDOW_MS).length >= CHAT_BURST * 2;
}
