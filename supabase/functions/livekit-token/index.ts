// The Circles room server. It checks who is asking, then:
//   { action: 'match', door, mood?, excludeRoomId? }  finds a room with space (or opens one) and returns a voice ticket
//   { action: 'join', roomId }                        returns a voice ticket for one room (from the Open now list)
//   { action: 'list', door: 'talk' }                  lists open talk rooms with how many people are in them
//   { action: 'stats' }                               how many people are in rooms right now (support rooms not counted)
//   { action: 'support' }                             whether a trained host is in a support room (yes/no only)
//   { action: 'delete_account' }                      deletes the person's own account and everything tied to it
//   { action: 'create', door, title, topic?, capacity?, private? }  starts a Talk or Play room (Start something)
//   { action: 'hand', roomId, up }                    raises or lowers your hand in a room you're in
//   { action: 'preview', roomId }                     a room link's title and seat count, before signing up
// Secrets (set in Supabase, never in the app): LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken, RoomServiceClient } from 'npm:livekit-server-sdk@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// --- room rules (tested by __tests__/matching.test.ts; keep this block free of Deno and npm imports) ---
// BEGIN MATCHING
type Door = 'talk' | 'play' | 'support';
type Mood = 'chat' | 'laugh' | 'advice';

type Candidate = {
  id: string;
  door: Door;
  mood: Mood | null;
  capacity: number;
  people: string[]; // LiveKit identities (user ids) in the room right now
  // Started by a person (Start something): found in the Open now list or by link, never filled by matching.
  custom?: boolean;
};

// Support rooms can hold up to 10 in the design, but the room circle draws 6 seats; until a 10-seat
// ring is built, every room holds 6 so nobody is ever in a room without being seen.
const CAPACITY: Record<Door, number> = { talk: 6, play: 6, support: 6 };

const TITLES: Record<string, string> = {
  'talk:chat': 'Just chat',
  'talk:laugh': 'Want to laugh',
  'talk:advice': 'Need advice',
  'talk:': 'Just chat',
  'play:': "Let's play",
  'support:': 'Someone to talk to',
};

function roomTitle(door: Door, mood: Mood | null): string {
  return TITLES[`${door}:${mood ?? ''}`] ?? 'Just chat';
}

// Picks the room to put someone in. New people go into existing rooms before new ones open:
// the fullest room that still has a seat wins, so nobody waits alone.
// Returns null when a new room should be opened (or, for support, when no host is there).
function pickRoom(
  candidates: Candidate[],
  opts: { door: Door; mood: Mood | null; me: string; avoid: Set<string>; hosts: Set<string>; excludeRoomId?: string },
): Candidate | null {
  const fits = candidates.filter((room) => {
    if (room.door !== opts.door) return false;
    if (room.custom) return false;
    if (room.id === opts.excludeRoomId) return false;
    // A talk room with no mood is a "Just chat" room.
    if (opts.mood && (room.mood ?? (room.door === 'talk' ? 'chat' : null)) !== opts.mood) return false;
    const others = room.people.filter((p) => p !== opts.me);
    if (others.length >= room.capacity) return false;
    if (others.some((p) => opts.avoid.has(p))) return false;
    // Never an unhosted support room: there must be a trained host in it already, or the newcomer is one.
    if (room.door === 'support' && !opts.hosts.has(opts.me) && !others.some((p) => opts.hosts.has(p))) return false;
    return true;
  });
  fits.sort((a, b) => b.people.length - a.people.length);
  return fits[0] ?? null;
}

// Start something: the topics a Talk room can have, and the room sizes people can choose.
const TOPICS = ['football', 'music', 'movies', 'faith', 'relationships', 'work', 'money', 'politics', 'tech', 'other'];
const SIZES = [4, 5, 6];
const TITLE_MAX = 40;

const LOOKALIKES: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i',
  'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'і': 'i', 'ѕ': 's', 'к': 'k',
  'м': 'm', 'т': 't', 'н': 'h', 'в': 'b', 'ο': 'o', 'α': 'a', 'ι': 'i', 'ε': 'e', 'κ': 'k', 'ν': 'v', 'ρ': 'p',
};
// Words a room name may not contain, even with spaces, accents or lookalike letters: anything that
// passes for the Circles team, or for a support room (those always have a trained host).
const RESERVED_JOINED = [
  'circles', 'official', 'moderator', 'someonetotalkto', 'crisis', 'helpline', 'hotline', 'therapist', 'therapy',
  'counsellor', 'counselor', 'counselling', 'counseling', 'suicide', 'selfharm', 'trainedhost', 'trainedlistener',
  'supportgroup', 'supportroom', 'peersupport',
];
const RESERVED_WORDS = /\b(admin|administrator|mod|mods|staff|host)\b/;

// Keep in step with src/rooms/start.ts (__tests__/start.test.ts checks both give the same answers).
function titleBreaksRules(title: string): 'number' | 'link' | 'reserved' | null {
  // Phone numbers: at least 7 digits once everything but letters and digits is taken out.
  if (/\p{Nd}{7,}/u.test(title.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, ''))) return 'number';
  if (/(https?:|www\.|\.(com|ng|net|org|io|me|ly|co)\b|@[a-z0-9_]{3,})/i.test(title)) return 'link';
  const plain = Array.from(title.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase())
    .map((ch) => LOOKALIKES[ch] ?? ch)
    .join('')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  const joined = plain.replace(/ /g, '');
  if (RESERVED_JOINED.some((word) => joined.includes(word)) || RESERVED_WORDS.test(plain)) return 'reserved';
  return null;
}

// A room title someone typed: plain words, 3 to 40 characters. Titles are shown to strangers.
// Returns null when it can't be used.
function cleanTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const title = raw
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const length = Array.from(title).length;
  if (length < 3 || length > TITLE_MAX) return null;
  if (titleBreaksRules(title)) return null;
  return title;
}

// A room someone started closes once nobody has been in it for a while, so old links stop working.
// active_at is the last time the server saw someone in it (joining, or in a room list).
const CUSTOM_EMPTY_MINUTES = 15;
function customRoomEnded(
  room: { custom?: boolean; created_at?: string; active_at?: string | null },
  peopleHere: number,
  now = Date.now(),
): boolean {
  if (!room.custom || peopleHere > 0) return false;
  const created = room.created_at ? new Date(room.created_at).getTime() : 0;
  const active = room.active_at ? new Date(room.active_at).getTime() : 0;
  return now - Math.max(created, active) > CUSTOM_EMPTY_MINUTES * 60 * 1000;
}
// END MATCHING

const DOORS: Door[] = ['talk', 'play', 'support'];
const MOODS: Mood[] = ['chat', 'laugh', 'advice'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  const livekitUrl = Deno.env.get('LIVEKIT_URL');
  if (!apiKey || !apiSecret || !livekitUrl) return json({ error: 'Voice is not set up yet' }, 500);

  const service = new RoomServiceClient(livekitUrl.replace(/^wss:/, 'https:'), apiKey, apiSecret);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  // A room link, before the visitor has an account (docs/design/pages/link-first.md › Link preview).
  // Only the room's title and how many seats are taken: never who is in it. Support rooms are never
  // shown by link (CLAUDE.md, Never list), so they look like a room that has ended.
  if (body.action === 'preview') {
    const { data: room } = await admin
      .from('rooms')
      .select('id, door, mood, title, topic, capacity, status, custom, created_at, active_at, livekit_room_name')
      .eq('id', String(body.roomId ?? ''))
      .maybeSingle();
    if (!room || room.door === 'support' || room.status !== 'open') return json({ status: 'ended' });
    let here = 0;
    let counted = true;
    try {
      here = (await service.listParticipants(room.livekit_room_name)).length;
    } catch {
      counted = false;
    }
    if (counted && customRoomEnded(room, here)) return json({ status: 'ended' });
    return json({
      status: 'open',
      room: { id: room.id, door: room.door, mood: room.mood, topic: room.topic, title: room.title, capacity: room.capacity },
      here,
    });
  }

  // 1. Who is asking? Use their own sign-in, so Row Level Security applies to what we read for them.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Please sign in' }, 401);
  const user = userData.user;

  // `admin` (the server's own key) reads what people can't read themselves: bans, hosts, others' blocks.
  const action = String(body.action ?? (body.roomId ? 'join' : ''));

  // Who is in each LiveKit room right now, by room name. A room nobody is in doesn't exist in LiveKit.
  // Set when LiveKit couldn't be reached: rooms then look empty, so nothing is closed for being empty.
  let livekitDown = false;
  async function peopleOrNone(names: string[]): Promise<Map<string, string[]>> {
    try {
      return await peopleIn(names);
    } catch {
      livekitDown = true;
      return new Map<string, string[]>();
    }
  }

  async function peopleIn(names: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (names.length === 0) return result;
    const live = await service.listRooms(names);
    await Promise.all(
      live
        .filter((r) => r.numParticipants > 0)
        .map(async (r) => {
          const list = await service.listParticipants(r.name);
          result.set(r.name, list.map((p) => p.identity));
        }),
    );
    return result;
  }

  // Rooms people started: note the ones with people in them, and close the ones left empty too long.
  type Tracked = { id: string; custom?: boolean; created_at?: string; active_at?: string | null; livekit_room_name: string };
  async function trackCustomRooms(rows: Tracked[], people: Map<string, string[]>): Promise<void> {
    const now = Date.now();
    const here = (r: Tracked) => people.get(r.livekit_room_name)?.length ?? 0;
    const active = rows.filter((r) => r.custom && here(r) > 0).map((r) => r.id);
    const ended = livekitDown ? [] : rows.filter((r) => customRoomEnded(r, here(r), now)).map((r) => r.id);
    await Promise.all([
      active.length > 0 ? admin.from('rooms').update({ active_at: new Date(now).toISOString() }).in('id', active) : null,
      ended.length > 0 ? admin.from('rooms').update({ status: 'closed' }).in('id', ended) : null,
    ]).catch(() => {});
  }

  // People this person blocked, and people who blocked them. They're never put in a room together.
  async function avoidList(): Promise<Set<string>> {
    const { data } = await admin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    return new Set((data ?? []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id) as string));
  }

  // Deleting your account removes everything tied to it (nickname, date of birth, saves, blocks).
  // Always allowed, even for a paused account (the app stores and the law require it).
  if (action === 'delete_account') {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return json({ error: 'Could not delete the account' }, 500);
    return json({ status: 'deleted' });
  }

  // --- list and stats: no voice, so no 18+ or nickname check needed beyond being signed in ---
  if (action === 'stats') {
    const { data: rooms } = await admin
      .from('rooms')
      .select('id, livekit_room_name, door, custom, created_at, active_at')
      .eq('status', 'open');
    const counted = (rooms ?? []).filter((r) => r.door !== 'support');
    const people = await peopleOrNone(counted.map((r) => r.livekit_room_name as string));
    await trackCustomRooms(counted as Tracked[], people);
    let total = 0;
    people.forEach((list) => (total += list.length));
    return json({ people: total, rooms: people.size });
  }

  // Is any trained host in a support room or online to open one? A yes/no only: never who, never how many.
  if (action === 'support') {
    const [{ data: hostRows }, { data: rooms }] = await Promise.all([
      admin.from('hosts').select('user_id'),
      admin.from('rooms').select('livekit_room_name').eq('status', 'open').eq('door', 'support'),
    ]);
    const hostIds = new Set((hostRows ?? []).map((h) => h.user_id as string));
    const people = await peopleIn((rooms ?? []).map((r) => r.livekit_room_name as string)).catch(
      () => new Map<string, string[]>(),
    );
    let hostInRoom = false;
    people.forEach((list) => {
      if (list.some((p) => hostIds.has(p))) hostInRoom = true;
    });
    return json({ hostInRoom, iAmHost: hostIds.has(user.id) });
  }

  if (action === 'list') {
    const door = (DOORS.includes(body.door as Door) ? body.door : 'talk') as Door;
    if (door === 'support') return json({ rooms: [] }); // never listed
    // Invite-only rooms are never listed: only their link opens them.
    const { data: rooms } = await admin
      .from('rooms')
      .select('id, title, mood, topic, capacity, custom, created_at, active_at, livekit_room_name')
      .eq('status', 'open')
      .eq('private', false)
      .eq('door', door);
    const names = (rooms ?? []).map((r) => r.livekit_room_name as string);
    const [people, avoid] = await Promise.all([peopleOrNone(names), avoidList()]);
    await trackCustomRooms((rooms ?? []) as Tracked[], people);
    const list = (rooms ?? [])
      .map((r) => ({ ...r, people: people.get(r.livekit_room_name as string) ?? [] }))
      .filter((r) => r.people.length > 0 && !r.people.some((p) => avoid.has(p)))
      .map((r) => ({ id: r.id, title: r.title, mood: r.mood, topic: r.topic, capacity: r.capacity, here: r.people.length }))
      .sort((a, b) => Number(a.here >= a.capacity) - Number(b.here >= b.capacity) || b.here - a.here);
    return json({ rooms: list });
  }

  // Raise or lower your own hand, in a room you're in right now. The server sets it, so a hand is the
  // only thing a person can change about themselves in a room.
  if (action === 'hand') {
    const { data: handBan } = await admin.from('bans').select('until').eq('user_id', user.id).maybeSingle();
    if (handBan && (!handBan.until || new Date(handBan.until) > new Date())) return json({ error: 'Your account is paused' }, 403);
    const { data: handRoom } = await admin
      .from('rooms')
      .select('livekit_room_name')
      .eq('id', String(body.roomId ?? ''))
      .maybeSingle();
    if (!handRoom) return json({ error: 'Room not found' }, 404);
    let current: Record<string, string> = {};
    try {
      current = (await service.getParticipant(handRoom.livekit_room_name, user.id)).attributes ?? {};
    } catch {
      return json({ error: 'You are not in this room' }, 409);
    }
    const up = body.up === true;
    // Nothing to change: do nothing, so a hand can't be made to flash.
    if (up === !!current.hand) return json({ status: 'ok' });
    // At most one change every few seconds per person.
    const last = Number(current.handChangedAt ?? 0);
    if (Date.now() - last < 3000) return json({ error: 'Too fast', status: 'too_fast' }, 429);
    try {
      const now = String(Date.now());
      await service.updateParticipant(handRoom.livekit_room_name, user.id, {
        attributes: { hand: up ? now : '', handChangedAt: now },
      });
    } catch {
      return json({ error: 'Could not change your hand' }, 500);
    }
    return json({ status: 'ok' });
  }

  if (action !== 'match' && action !== 'join' && action !== 'create') return json({ error: 'Unknown action' }, 400);

  // --- voice: nobody speaks before the 18+ question and a nickname (CLAUDE.md, Never list) ---
  const { data: ban } = await admin.from('bans').select('until').eq('user_id', user.id).maybeSingle();
  if (ban && (!ban.until || new Date(ban.until) > new Date())) return json({ error: 'Your account is paused' }, 403);

  const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
  const nickname = profile?.nickname ?? '';
  if (!nickname) return json({ error: 'Choose a nickname first' }, 403);

  const { data: birth } = await supabase.from('birth_dates').select('date_of_birth').eq('id', user.id).maybeSingle();
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  if (!birth?.date_of_birth || new Date(birth.date_of_birth) > eighteenYearsAgo) {
    return json({ error: 'Circles is for adults' }, 403);
  }

  // Unfinished Find the Impostor rounds are cleared after two hours, even if nobody plays again
  // (the Privacy Policy promises this).
  await admin
    .from('impostor_rounds')
    .delete()
    .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .then(
      () => {},
      () => {},
    );

  const { data: hostRows } = await admin.from('hosts').select('user_id');
  const hosts = new Set((hostRows ?? []).map((h) => h.user_id as string));
  const isHost = hosts.has(user.id);
  const avoid = await avoidList();

  type RoomRow = {
    id: string;
    door: Door;
    mood: Mood | null;
    topic?: string | null;
    title: string | null;
    capacity: number;
    status: string;
    custom?: boolean;
    created_at?: string;
    active_at?: string | null;
    livekit_room_name: string;
  };
  const ROOM_FIELDS = 'id, door, mood, topic, title, capacity, status, custom, created_at, active_at, livekit_room_name';
  let room: RoomRow | null = null;

  if (action === 'create') {
    // Start something: a Talk or Play room with the person's own title. Never a support room: those
    // only ever open for trained hosts, through the door.
    const door: Door | null = body.door === 'talk' || body.door === 'play' ? body.door : null;
    const title = cleanTitle(body.title);
    if (!door) return json({ error: 'Rooms you start can be Talk or Play', status: 'bad_room' }, 400);
    if (!title) return json({ error: 'That title can’t be used', status: 'bad_title' }, 400);
    const topic = door === 'talk' && TOPICS.includes(String(body.topic)) ? String(body.topic) : null;
    const capacity = SIZES.includes(Number(body.capacity)) ? Number(body.capacity) : CAPACITY[door];
    // A few rooms an hour is plenty for anyone, and stops one person flooding the lists.
    const { count } = await admin
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('custom', true)
      .eq('created_by', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= 3) return json({ error: 'You’ve started a few rooms already', status: 'too_many' }, 429);
    const id = crypto.randomUUID();
    const { data: created, error } = await admin
      .from('rooms')
      .insert({
        id,
        door,
        mood: null,
        topic,
        kind: 'peer',
        title,
        capacity,
        status: 'open',
        custom: true,
        private: body.private === true,
        created_by: user.id,
        livekit_room_name: `circles-${id}`,
      })
      .select(ROOM_FIELDS)
      .single();
    if (error || !created) return json({ error: 'Could not open a room' }, 500);
    room = created as RoomRow;
  } else if (action === 'join') {
    const { data } = await admin
      .from('rooms')
      .select(ROOM_FIELDS)
      .eq('id', String(body.roomId ?? ''))
      .maybeSingle();
    // Support rooms are only ever reached through the "Need someone to talk to" door, never by a link or
    // a remembered room id (CLAUDE.md, Never list). To everyone but a host they look like a room that has ended.
    if (!data || data.status !== 'open' || (data.door === 'support' && !isHost)) {
      return json({ error: 'This room has ended', status: 'ended' }, 410);
    }
    room = data as RoomRow;
    const people = (await peopleOrNone([room.livekit_room_name])).get(room.livekit_room_name) ?? [];
    if (!livekitDown && customRoomEnded(room, people.length)) {
      await admin.from('rooms').update({ status: 'closed' }).eq('id', room.id);
      return json({ error: 'This room has ended', status: 'ended' }, 410);
    }
    const others = people.filter((p: string) => p !== user.id);
    if (others.length >= room.capacity) return json({ error: 'This room is full' }, 409);
    if (others.some((p: string) => avoid.has(p))) return json({ error: 'This room is full' }, 409);
    if (room.door === 'support' && !isHost && !others.some((p: string) => hosts.has(p))) {
      return json({ error: 'No host here right now', status: 'no_host' }, 409);
    }
  } else {
    const door = DOORS.includes(body.door as Door) ? (body.door as Door) : 'talk';
    const mood = door === 'talk' && MOODS.includes(body.mood as Mood) ? (body.mood as Mood) : null;
    const { data: rows } = await admin
      .from('rooms')
      .select(ROOM_FIELDS)
      .eq('status', 'open')
      .eq('private', false)
      .eq('door', door);
    const all = (rows ?? []) as RoomRow[];
    const people = await peopleOrNone(all.map((r) => r.livekit_room_name));
    await trackCustomRooms(all, people);
    const candidates: Candidate[] = all.map((r) => ({
      id: r.id,
      door: r.door,
      mood: r.mood,
      capacity: r.capacity,
      people: people.get(r.livekit_room_name) ?? [],
      custom: !!r.custom,
    }));
    const picked = pickRoom(candidates, {
      door,
      mood,
      me: user.id,
      avoid,
      hosts,
      excludeRoomId: typeof body.excludeRoomId === 'string' ? body.excludeRoomId : undefined,
    });

    if (picked) {
      room = all.find((r) => r.id === picked.id) ?? null;
    } else if (door === 'support' && !isHost) {
      // Never an unhosted support room. The app shows the help options and when to come back.
      return json({ status: 'no_host' });
    } else {
      // Reuse an empty room of the same kind before opening a new one.
      const newMood: Mood | null = door === 'talk' ? (mood ?? 'chat') : null;
      const empty = candidates.find(
        (c) =>
          c.people.length === 0 &&
          !c.custom &&
          c.id !== body.excludeRoomId &&
          (c.mood ?? (door === 'talk' ? 'chat' : null)) === newMood &&
          (door !== 'support' || isHost),
      );
      if (empty) {
        room = all.find((r) => r.id === empty.id) ?? null;
      } else {
        const id = crypto.randomUUID();
        const { data: created, error } = await admin
          .from('rooms')
          .insert({
            id,
            door,
            mood: newMood,
            kind: door === 'support' ? 'hosted' : 'peer',
            title: roomTitle(door, newMood),
            capacity: CAPACITY[door],
            status: 'open',
            created_by: user.id,
            livekit_room_name: `circles-${id}`,
          })
          .select(ROOM_FIELDS)
          .single();
        if (error || !created) return json({ error: 'Could not open a room' }, 500);
        room = created as RoomRow;
      }
    }
  }

  if (!room) return json({ error: 'Could not find a room' }, 500);
  if (room.custom) await admin.from('rooms').update({ active_at: new Date().toISOString() }).eq('id', room.id);

  // The ticket only lets this person into this one room, for one hour. The nickname is the only name in it.
  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: nickname,
    ttl: '1h',
    metadata: JSON.stringify({ host: isHost }),
  });
  token.addGrant({
    room: room.livekit_room_name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // Room chat travels over LiveKit between the people in the room only, with the sender set by
    // LiveKit (it can't be faked) and nothing stored.
    canPublishData: true,
    // No canUpdateOwnMetadata: names, the host flag and raised hands are only ever set by this server,
    // so nobody can rename themselves or pretend to be a trained host.
  });

  return json({
    status: 'ok',
    token: await token.toJwt(),
    url: livekitUrl,
    roomName: room.livekit_room_name,
    room: {
      id: room.id,
      door: room.door,
      mood: room.mood,
      topic: room.topic ?? null,
      title: room.title ?? roomTitle(room.door, room.mood),
      capacity: room.capacity,
    },
    isHost,
  });
});
