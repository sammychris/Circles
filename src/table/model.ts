// The Table: one shared thing in the middle of a room (docs/design/pages/activities.md). The person who
// put it there (the presenter) holds it on their phone and tells the others; nothing is stored, except
// photos, which are deleted a few hours after the room. These rules run on every phone.

import { CHAT_MAX_LINES } from '../rooms/chat';

export const TABLE_TOPIC = 'table';
export const NOTE_MAX = 500;
export const PHOTOS_MAX = 20;
export const VIDEO_TITLE_MAX = 60;

export type Door = 'talk' | 'play' | 'support';
export type TableKind = 'note' | 'video' | 'photos' | 'screen';
export type VideoRef = { provider: 'youtube' | 'vimeo'; id: string };
export type Photo = { url: string; path: string };

type Common = { id: string; by: string; byName: string; at: number };
export type TableItem = Common &
  (
    | { kind: 'note'; text: string; link: string | null }
    | { kind: 'video'; video: VideoRef; title: string }
    | { kind: 'photos'; photos: Photo[] }
    | { kind: 'screen' }
  );

// Where the presenter is: the photo they're showing, or the video's play state.
export type TableState = { seq: number; index?: number; playing?: boolean; position?: number; sentAt?: number };

export type TableMessage =
  | { k: 'put'; item: TableItem; state: TableState }
  | { k: 'state'; id: string; state: TableState }
  | { k: 'off'; id: string }
  | { k: 'hello' };

// Support rooms only ever get notes and links: no photos, videos or screens (CLAUDE.md, Never list).
export function allowedKinds(door: Door): TableKind[] {
  return door === 'support' ? ['note'] : ['note', 'video', 'photos', 'screen'];
}

const INVISIBLE = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

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

// Checks an item another phone sent. The presenter is always the sender, never what the message says.
export function acceptItem(raw: unknown, from: { id: string; nickname: string }, door: Door, photoUrlStart: string): TableItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(r.id) ? r.id : null;
  const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : null;
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
    const photos = list
      .map((p) => p as Record<string, unknown>)
      .filter((p) => typeof p.url === 'string' && typeof p.path === 'string' && p.url.startsWith(photoUrlStart))
      .map((p) => ({ url: p.url as string, path: p.path as string }));
    if (photos.length === 0) return null;
    return { ...common, kind, photos };
  }
  if (kind === 'screen') return { ...common, kind };
  return null;
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
  if (item.kind === 'photos') return `On the table, ${item.photos.length} photos by ${item.byName}: ${item.photos.map((p) => p.path).join(', ')}`;
  return `On the table, ${item.byName} was sharing their screen`;
}
