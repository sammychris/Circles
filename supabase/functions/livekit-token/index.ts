// Hands out a LiveKit "ticket" (access token) for a room, after checking who is asking and whether the room is open.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  const livekitUrl = Deno.env.get('LIVEKIT_URL');
  if (!apiKey || !apiSecret || !livekitUrl) return json({ error: 'Voice is not set up yet' }, 500);

  // 1. Who is asking? Use their own sign-in, so Row Level Security applies to everything we read.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Please sign in' }, 401);
  const user = userData.user;
  const nickname = String(user.user_metadata?.nickname ?? '').trim().slice(0, 20);
  if (!nickname) return json({ error: 'Choose a nickname first' }, 403);

  // 2. Which room, and is it open?
  let roomId = '';
  try {
    roomId = String((await req.json()).roomId ?? '');
  } catch {
    return json({ error: 'Missing room' }, 400);
  }
  const { data: room } = await supabase
    .from('rooms')
    .select('id, capacity, status, livekit_room_name')
    .eq('id', roomId)
    .maybeSingle();
  if (!room) return json({ error: 'Room not found' }, 404);
  if (room.status !== 'open') return json({ error: 'This room is closed' }, 403);

  // 3. Is there a seat? Count who is in the voice room right now (not counting this person rejoining).
  try {
    const service = new RoomServiceClient(livekitUrl.replace(/^wss:/, 'https:'), apiKey, apiSecret);
    const people = await service.listParticipants(room.livekit_room_name);
    const others = people.filter((p) => p.identity !== user.id).length;
    if (others >= room.capacity) return json({ error: 'This room is full' }, 409);
  } catch {
    // A room nobody has joined yet does not exist in LiveKit. That means it is empty, so carry on.
  }

  // 4. The ticket. It only lets this person into this one room, for one hour.
  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: nickname,
    ttl: '1h',
  });
  token.addGrant({
    room: room.livekit_room_name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });

  return json({ token: await token.toJwt(), url: livekitUrl, roomName: room.livekit_room_name });
});
