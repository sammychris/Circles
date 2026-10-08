// Room links. A shared link looks like https://<web address>/?room=<id>&by=<nickname>, which works on any
// simple web host. The app also understands circles://r/<id> and https://<web address>/r/<id>.

import { nicknameProblem } from './validation';

export type LinkTarget = { roomId?: string; by?: string; page?: 'privacy' | 'terms' };

const ID = /^[A-Za-z0-9-]{1,64}$/;
// The inviter's name is only shown when it could be a real nickname: no phone numbers, and nothing that
// passes for the Circles team.
const isNick = (name: string) => /^[A-Za-z0-9_]{2,20}$/.test(name) && nicknameProblem(name) === null;

export function roomLink(webUrl: string, roomId: string, by?: string): string {
  const params = new URLSearchParams({ room: roomId });
  if (by && isNick(by)) params.set('by', by);
  return `${webUrl}/?${params.toString()}`;
}

// Reads a link. Anything that doesn't look like a real room id or nickname is ignored.
export function parseLink(url: string | null | undefined): LinkTarget {
  if (!url) return {};
  let parsed: URL;
  try {
    parsed = new URL(url.replace(/^circles:\/\//, 'https://circles.app/'));
  } catch {
    return {};
  }
  const out: LinkTarget = {};
  const pathRoom = parsed.pathname.match(/^\/r\/([^/]+)\/?$/)?.[1];
  const room = parsed.searchParams.get('room') ?? pathRoom ?? undefined;
  if (room && ID.test(room)) out.roomId = room;
  const by = parsed.searchParams.get('by');
  if (by && isNick(by)) out.by = by;
  const page = parsed.searchParams.get('page') ?? parsed.pathname.replace(/^\/|\/$/g, '');
  if (page === 'privacy' || page === 'terms') out.page = page;
  return out;
}
