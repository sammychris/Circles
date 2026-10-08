// The Table: one shared thing in the middle of a room (docs/design/pages/activities.md). The person who
// put it there (the presenter) holds it on their phone and tells the others; nothing is stored, except
// photos, which are deleted a few hours after the room. These rules run on every phone.

import { GAME_IDS, GAME_NAMES, type GameId } from '../games/tableGame';
import { cleanScore, type SetScore } from '../games/score';
import { CHAT_MAX_LINES } from '../rooms/chat';

export const TABLE_TOPIC = 'table';
export const NOTE_MAX = 500;
export const PHOTOS_MAX = 20;
export const VIDEO_TITLE_MAX = 60;
export const TOPIC_MAX = 120;
export const QUESTION_MAX = 160;
export const ANSWER_MAX = 60;
export const TURN_MINUTES = [1, 2, 3] as const;

export type Door = 'talk' | 'play' | 'support' | 'learn';
export type TableKind = 'note' | 'video' | 'photos' | 'screen' | 'turns' | 'quiz' | 'words' | 'game';
export const WORDS_MAX = 10;
export const WORD_MAX = 40;
export const MEANING_MAX = 80;
export type WordPair = { w: string; m: string };
export type VideoRef = { provider: 'youtube' | 'vimeo'; id: string };
export type Photo = { url: string; path: string };
// On the wire a photo is just its storage path and link token; every phone rebuilds the link itself,
// so a photo can only ever come from our own storage, and the path in a report is the real one.
export type PhotoWire = { p: string; t: string };

const PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9-]{1,64}\/[a-z0-9]{1,20}-\d{1,2}\.jpg$/;
const TOKEN = /^[A-Za-z0-9._-]{10,2000}$/;

export function photoToWire(photo: Photo): PhotoWire | null {
  const token = photo.url.split('?token=')[1];
  return token && TOKEN.test(token) && PATH.test(photo.path) ? { p: photo.path, t: token } : null;
}

export function photoFromWire(raw: unknown, photoUrlStart: string): Photo | null {
  const w = raw as Partial<PhotoWire> | null;
  if (!w || typeof w.p !== 'string' || typeof w.t !== 'string' || !PATH.test(w.p) || !TOKEN.test(w.t)) return null;
  return { path: w.p, url: `${photoUrlStart}${w.p}?token=${w.t}` };
}

type Common = { id: string; by: string; byName: string; at: number };
export type TableItem = Common &
  (
    | { kind: 'note'; text: string; link: string | null }
    | { kind: 'video'; video: VideoRef; title: string }
    | { kind: 'photos'; photos: Photo[] }
    | { kind: 'screen' }
    // Take turns: a speaking order for stories and debates, with a gentle timer.
    | { kind: 'turns'; topic: string; minutes: number }
    // Quiz: everyone answers privately; the presenter reveals how many chose each. No scores kept.
    | { kind: 'quiz'; question: string; answers: string[]; correct: number | null }
    // Words (Learn rooms): up to 10 words or phrases with meanings, shown one at a time.
    | { kind: 'words'; words: WordPair[] }
    // A game (Draughts, Chess, Whot, Mafia), held and checked on the starter's phone.
    | { kind: 'game'; game: GameId }
  );

// Where the presenter is: the photo they're showing, the video's play state, whose turn it is, or a
// quiz's revealed counts.
export type TableState = {
  seq: number;
  index?: number;
  playing?: boolean;
  position?: number;
  sentAt?: number;
  order?: string[];
  startedAt?: number;
  revealed?: boolean;
  counts?: number[];
  // A game's public state (never anyone's hand or role).
  g?: unknown;
  // The score while people keep playing this game (only for this sitting; src/games/score.ts).
  set?: SetScore;
};

export type TableMessage =
  | { k: 'put'; item: unknown; state: TableState }
  | { k: 'state'; id: string; state: TableState }
  | { k: 'off'; id: string }
  | { k: 'hello' }
  // To the presenter only: a quiz answer, or the speaker passing their turn.
  | { k: 'answer'; id: string; choice: number }
  | { k: 'pass'; id: string }
  // A game move, to the starter only; and, from the starter, someone's own hand or role, to them only.
  | { k: 'move'; id: string; move: unknown }
  | { k: 'secret'; id: string; data: unknown }
  // From the starter, to the player only: whether their move was played (game-mode.md › Instant moves).
  | { k: 'done'; id: string; ok: boolean };

// Support rooms only ever get notes and links: no photos, videos or screens (CLAUDE.md, Never list).
export function allowedKinds(door: Door): TableKind[] {
  if (door === 'support') return ['note'];
  // Learn rooms: notes, words, turns and quizzes (design direction › Rules by kind of room).
  if (door === 'learn') return ['note', 'words', 'turns', 'quiz'];
  const all: TableKind[] = ['note', 'turns', 'quiz', 'video', 'photos', 'screen'];
  // Games only in game rooms (play.md › Rules), never in support rooms.
  return door === 'play' ? [...all, 'game'] : all;
}

const INVISIBLE = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

export function cleanNote(text: string): string {
  let lines = 0;
  const clean = text
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/\n/g, () => (++lines < CHAT_MAX_LINES * 3 ? '\n' : ' '))
    .trim();
  return Array.from(clean).slice(0, NOTE_MAX).join('').trim();
}

// The first web link in a note, if there is one.
export function findLink(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  try {
    const url = new URL(match[0].replace(/[).,!?]+$/, ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// "youtube.com" from a link: links on the table show only the site name (activities.md › Note or link).
export function linkSite(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Reads a YouTube or Vimeo link. Anything else isn't a video we can show (only official players).
export function parseVideoLink(raw: string): VideoRef | null {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^(?!https?:\/\/)/i, 'https://'));
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be' && YOUTUBE_ID.test(parts[0] ?? '')) return { provider: 'youtube', id: parts[0] };
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v');
    if (v && YOUTUBE_ID.test(v)) return { provider: 'youtube', id: v };
    if (['shorts', 'live', 'embed'].includes(parts[0] ?? '') && YOUTUBE_ID.test(parts[1] ?? '')) {
      return { provider: 'youtube', id: parts[1] };
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parts.find((p) => /^\d{5,12}$/.test(p));
    if (id) return { provider: 'vimeo', id };
  }
  return null;
}

// How an item travels between phones.
export function itemToWire(item: TableItem): Record<string, unknown> {
  if (item.kind !== 'photos') return item;
  const { photos, ...rest } = item;
  return { ...rest, photos: photos.map(photoToWire).filter(Boolean) };
}

// Checks an item another phone sent. The presenter is always the sender, never what the message says.
// The time it was put on can't be claimed earlier than 10 seconds before it arrived, so nobody can
// push other items off the table by pretending theirs came first.
export function acceptItem(
  raw: unknown,
  from: { id: string; nickname: string },
  door: Door,
  photoUrlStart: string,
  now = Date.now(),
): TableItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(r.id) ? r.id : null;
  const claimed = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : null;
  const at = claimed === null ? null : Math.min(Math.max(claimed, now - 10_000), now);
  const kind = r.kind as TableKind;
  if (!id || at === null || !allowedKinds(door).includes(kind)) return null;
  const common = { id, by: from.id, byName: from.nickname, at };
  if (kind === 'note') {
    const text = typeof r.text === 'string' ? cleanNote(r.text) : '';
    if (!text) return null;
    return { ...common, kind, text, link: findLink(text) };
  }
  if (kind === 'video') {
    const v = r.video as Record<string, unknown> | undefined;
    const video =
      v && v.provider === 'youtube' && typeof v.id === 'string' && YOUTUBE_ID.test(v.id)
        ? ({ provider: 'youtube', id: v.id } as const)
        : v && v.provider === 'vimeo' && typeof v.id === 'string' && /^\d{5,12}$/.test(v.id)
          ? ({ provider: 'vimeo', id: v.id } as const)
          : null;
    if (!video) return null;
    const title = typeof r.title === 'string' ? cleanNote(r.title).replace(/\n/g, ' ').slice(0, VIDEO_TITLE_MAX) : '';
    return { ...common, kind, video, title };
  }
  if (kind === 'photos') {
    const list = Array.isArray(r.photos) ? r.photos.slice(0, PHOTOS_MAX) : [];
    // A photo's folder must be the sender's own.
    const photos = list
      .map((p) => photoFromWire(p, photoUrlStart))
      .filter((p): p is Photo => !!p && p.path.startsWith(`${from.id}/`));
    if (photos.length === 0) return null;
    return { ...common, kind, photos };
  }
  if (kind === 'screen') return { ...common, kind };
  if (kind === 'game') {
    return GAME_IDS.includes(r.game as GameId) ? { ...common, kind, game: r.game as GameId } : null;
  }
  if (kind === 'words') {
    const words = Array.isArray(r.words)
      ? r.words
          .slice(0, WORDS_MAX)
          .map((p) => p as Partial<WordPair>)
          .map((p) => ({ w: typeof p.w === 'string' ? oneLine(p.w, WORD_MAX) : '', m: typeof p.m === 'string' ? oneLine(p.m, MEANING_MAX) : '' }))
          .filter((p) => p.w)
      : [];
    return words.length > 0 ? { ...common, kind, words } : null;
  }
  if (kind === 'turns') {
    const topic = typeof r.topic === 'string' ? oneLine(r.topic, TOPIC_MAX) : '';
    const minutes = TURN_MINUTES.includes(r.minutes as 1 | 2 | 3) ? (r.minutes as number) : 2;
    return { ...common, kind, topic, minutes };
  }
  if (kind === 'quiz') {
    const question = typeof r.question === 'string' ? oneLine(r.question, QUESTION_MAX) : '';
    const answers = Array.isArray(r.answers)
      ? r.answers.slice(0, 4).map((a) => (typeof a === 'string' ? oneLine(a, ANSWER_MAX) : '')).filter(Boolean)
      : [];
    if (!question || answers.length < 2) return null;
    const correct = typeof r.correct === 'number' && Number.isInteger(r.correct) && r.correct >= 0 && r.correct < answers.length ? r.correct : null;
    return { ...common, kind, question, answers, correct };
  }
  return null;
}

// One line of plain text, at most `max` characters.
export function oneLine(text: string, max: number): string {
  return Array.from(cleanNote(text).replace(/\s+/g, ' ').trim()).slice(0, max).join('');
}

// Words typed one per line: "kedu = how are you" (or with a dash or colon). At most 10.
export function parseWords(text: string): WordPair[] {
  return text
    .split('\n')
    .map((line) => {
      const [w, ...rest] = line.split(/\s*(?:=|:|\s-\s|–|—)\s*/);
      return { w: oneLine(w ?? '', WORD_MAX), m: oneLine(rest.join(' '), MEANING_MAX) };
    })
    .filter((p) => p.w)
    .slice(0, WORDS_MAX);
}

// Take turns: who speaks next, skipping anyone who left.
export function nextTurn(order: string[], index: number, here: string[]): number {
  for (let step = 1; step <= order.length; step++) {
    const i = (index + step) % order.length;
    if (here.includes(order[i])) return i;
  }
  return index;
}

// Quiz: how many chose each answer, from each person's latest answer. Never who chose what.
export function tally(answers: Map<string, number>, count: number): number[] {
  const counts = new Array(count).fill(0);
  answers.forEach((choice) => {
    if (choice >= 0 && choice < count) counts[choice] += 1;
  });
  return counts;
}

// Two people put something on the table at the same moment: the first one stays. The presenter can
// always replace their own item.
export function keepsTable(current: TableItem | null, incoming: TableItem): boolean {
  if (!current) return true;
  if (current.id === incoming.id) return true;
  if (current.by === incoming.by) return incoming.at >= current.at;
  if (incoming.at !== current.at) return incoming.at < current.at;
  return incoming.by < current.by;
}

// Where a presenter's video is right now, from their last message.
export function videoPositionNow(state: TableState, now: number): number {
  const base = state.position ?? 0;
  if (!state.playing || !state.sentAt) return base;
  return base + Math.max(0, now - state.sentAt) / 1000;
}

export function cleanState(raw: unknown, kind: TableKind, photoCount: number): TableState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const seq = typeof r.seq === 'number' && Number.isFinite(r.seq) ? r.seq : null;
  if (seq === null) return null;
  if (kind === 'photos') {
    const index = typeof r.index === 'number' ? Math.round(r.index) : 0;
    return { seq, index: Math.min(Math.max(index, 0), Math.max(photoCount - 1, 0)) };
  }
  if (kind === 'game') {
    // The starter's phone checks every move; this only keeps a message from being huge.
    const g = r.g;
    const set = cleanScore(r.set);
    return { seq, ...(g !== undefined && JSON.stringify(g).length <= 12_000 ? { g } : {}), ...(set ? { set } : {}) };
  }
  if (kind === 'words') {
    // index: how many words are showing.
    const index = typeof r.index === 'number' ? Math.min(Math.max(Math.round(r.index), 0), WORDS_MAX) : 0;
    return { seq, index };
  }
  if (kind === 'turns') {
    const order = Array.isArray(r.order) ? r.order.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 12) : [];
    const index = typeof r.index === 'number' ? Math.min(Math.max(Math.round(r.index), 0), Math.max(order.length - 1, 0)) : 0;
    const startedAt = typeof r.startedAt === 'number' && Number.isFinite(r.startedAt) ? r.startedAt : Date.now();
    const sentAt = typeof r.sentAt === 'number' && Number.isFinite(r.sentAt) ? r.sentAt : startedAt;
    return { seq, order, index, startedAt, sentAt };
  }
  if (kind === 'quiz') {
    const revealed = r.revealed === true;
    const counts = revealed && Array.isArray(r.counts) ? r.counts.slice(0, 4).map((n) => (typeof n === 'number' && n >= 0 ? Math.round(n) : 0)) : undefined;
    return { seq, revealed, counts };
  }
  if (kind === 'video') {
    const position = typeof r.position === 'number' && Number.isFinite(r.position) ? Math.max(0, r.position) : 0;
    const sentAt = typeof r.sentAt === 'number' && Number.isFinite(r.sentAt) ? r.sentAt : Date.now();
    return { seq, playing: r.playing === true, position, sentAt };
  }
  return { seq };
}

// How the item reads in a report, so the team sees what was on the table.
export function describeItem(item: TableItem): string {
  if (item.kind === 'note') return `On the table, a note by ${item.byName}: "${item.text}"`;
  if (item.kind === 'video') return `On the table, a ${item.video.provider} video by ${item.byName}: ${item.video.id}${item.title ? ` (${item.title})` : ''}`;
  if (item.kind === 'game') return `On the table, a game of ${GAME_NAMES[item.game]} started by ${item.byName}`;
  if (item.kind === 'words') return `On the table, words by ${item.byName}: ${item.words.map((p) => `${p.w} = ${p.m}`).join('; ')}`;
  if (item.kind === 'turns') return `On the table, ${item.byName} started taking turns${item.topic ? `: "${item.topic}"` : ''}`;
  if (item.kind === 'quiz') return `On the table, a quiz by ${item.byName}: "${item.question}" (${item.answers.join(' / ')})`;
  if (item.kind === 'photos') return `On the table, ${item.photos.length} photos by ${item.byName}: ${item.photos.map((p) => p.path).join(', ')}`;
  return `On the table, ${item.byName} was sharing their screen`;
}
