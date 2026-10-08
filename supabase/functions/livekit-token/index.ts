// The Circles room server. It checks who is asking, then:
//   { action: 'match', door, mood?, excludeRoomId? }  finds a room with space (or opens one) and returns a voice ticket
//   { action: 'join', roomId }                        returns a voice ticket for one room (from the Open now list)
//   { action: 'list', door: 'talk' }                  lists open talk rooms with how many people are in them
//   { action: 'stats' }                               how many people are in rooms right now (support rooms not counted)
//   { action: 'support' }                             whether a trained host is in a support room (yes/no only)
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
};

const CAPACITY: Record<Door, number> = { talk: 6, play: 6, support: 10 };

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
    if (room.id === opts.excludeRoomId) return false;
    if (opts.mood && room.mood !== opts.mood) return false;
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

  // 1. Who is asking? Use their own sign-in, so Row Level Security applies to what we read for them.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Please sign in' }, 401);
  const user = userData.user;

  // The server's own key, for things people can't read themselves: bans, hosts, other people's blocks.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const action = String(body.action ?? (body.roomId ? 'join' : ''));

  const service = new RoomServiceClient(livekitUrl.replace(/^wss:/, 'https:'), apiKey, apiSecret);

  // Who is in each LiveKit room right now, by room name. A room nobody is in doesn't exist in LiveKit.
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

  // People this person blocked, and people who blocked them. They're never put in a room together.
  async function avoidList(): Promise<Set<string>> {
    const { data } = await admin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    return new Set((data ?? []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id) as string));
  }

  // --- list and stats: no voice, so no 18+ or nickname check needed beyond being signed in ---
  if (action === 'stats') {
    const { data: rooms } = await admin.from('rooms').select('livekit_room_name, door').eq('status', 'open');
    const names = (rooms ?? []).filter((r) => r.door !== 'support').map((r) => r.livekit_room_name as string);
    const people = await peopleIn(names).catch(() => new Map<string, string[]>());
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
    const { data: rooms } = await admin
      .from('rooms')
      .select('id, title, mood, capacity, livekit_room_name')
      .eq('status', 'open')
      .eq('door', door);
    const names = (rooms ?? []).map((r) => r.livekit_room_name as string);
    const [people, avoid] = await Promise.all([peopleIn(names).catch(() => new Map<string, string[]>()), avoidList()]);
    const list = (rooms ?? [])
      .map((r) => ({ ...r, people: people.get(r.livekit_room_name as string) ?? [] }))
      .filter((r) => r.people.length > 0 && !r.people.some((p) => avoid.has(p)))
      .map((r) => ({ id: r.id, title: r.title, mood: r.mood, capacity: r.capacity, here: r.people.length }))
      .sort((a, b) => Number(a.here >= a.capacity) - Number(b.here >= b.capacity) || b.here - a.here);
    return json({ rooms: list });
  }

  if (action !== 'match' && action !== 'join') return json({ error: 'Unknown action' }, 400);

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

  const { data: hostRows } = await admin.from('hosts').select('user_id');
  const hosts = new Set((hostRows ?? []).map((h) => h.user_id as string));
  const isHost = hosts.has(user.id);
  const avoid = await avoidList();

  type RoomRow = { id: string; door: Door; mood: Mood | null; title: string | null; capacity: number; status: string; livekit_room_name: string };
  let room: RoomRow | null = null;

  if (action === 'join') {
    const { data } = await admin
      .from('rooms')
      .select('id, door, mood, title, capacity, status, livekit_room_name')
      .eq('id', String(body.roomId ?? ''))
      .maybeSingle();
    if (!data) return json({ error: 'Room not found' }, 404);
    room = data as RoomRow;
    if (room.status !== 'open') return json({ error: 'This room is closed' }, 403);
    const people = (await peopleIn([room.livekit_room_name]).catch(() => new Map())).get(room.livekit_room_name) ?? [];
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
      .select('id, door, mood, title, capacity, status, livekit_room_name')
      .eq('status', 'open')
      .eq('door', door);
    const all = (rows ?? []) as RoomRow[];
    const people = await peopleIn(all.map((r) => r.livekit_room_name)).catch(() => new Map<string, string[]>());
    const candidates: Candidate[] = all.map((r) => ({
      id: r.id,
      door: r.door,
      mood: r.mood,
      capacity: r.capacity,
      people: people.get(r.livekit_room_name) ?? [],
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
      const empty = candidates.find(
        (c) => c.people.length === 0 && c.id !== body.excludeRoomId && (c.mood ?? null) === mood && (door !== 'support' || isHost),
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
            mood,
            kind: door === 'support' ? 'hosted' : 'peer',
            title: roomTitle(door, mood),
            capacity: CAPACITY[door],
            status: 'open',
            created_by: user.id,
            livekit_room_name: `circles-${id}`,
          })
          .select('id, door, mood, title, capacity, status, livekit_room_name')
          .single();
        if (error || !created) return json({ error: 'Could not open a room' }, 500);
        room = created as RoomRow;
      }
    }
  }

  if (!room) return json({ error: 'Could not find a room' }, 500);

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
    canPublishData: false,
  });

  return json({
    status: 'ok',
    token: await token.toJwt(),
    url: livekitUrl,
    roomName: room.livekit_room_name,
    room: { id: room.id, door: room.door, mood: room.mood, title: room.title ?? roomTitle(room.door, room.mood), capacity: room.capacity },
    isHost,
  });
});
