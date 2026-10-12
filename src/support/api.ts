import { supabase } from '../lib/supabase';
import { call } from '../rooms/api';

// Support: hosts, applications and one-on-one (CIRCLES_INTENT.md › Support, docs/support-section-spec.md).
// Everything goes through database functions that only ever show people their own requests.

export type HostKind = 'listener' | 'professional';

export type HostCard = {
  userId: string;
  nickname: string;
  kind: HostKind;
  // Professionals only: their real details, shown to everyone.
  fullName: string | null;
  credential: string | null;
  issuingBody: string | null;
  intro: string;
  topics: string[];
  languages: string[];
  // Trusted and offering one-on-one.
  oneOnOne: boolean;
  online: boolean;
  minutes: number;
  priceNaira: number;
  freeFirst: boolean;
  sessions: number;
  rating: number | null;
};

type CardRow = {
  user_id: string;
  nickname: string;
  kind: HostKind;
  full_name: string | null;
  credential: string | null;
  issuing_body: string | null;
  intro: string;
  topics: string[];
  languages: string[];
  one_on_one: boolean;
  online: boolean;
  minutes: number;
  price_naira: number;
  free_first: boolean;
  sessions: number;
  rating: number | string | null;
};

function toCard(r: CardRow): HostCard {
  return {
    userId: r.user_id,
    nickname: r.nickname,
    kind: r.kind,
    fullName: r.full_name,
    credential: r.credential,
    issuingBody: r.issuing_body,
    intro: r.intro,
    topics: r.topics ?? [],
    languages: r.languages ?? [],
    oneOnOne: r.one_on_one,
    online: r.online,
    minutes: r.minutes,
    priceNaira: r.price_naira,
    freeFirst: r.free_first,
    sessions: r.sessions,
    rating: r.rating === null ? null : Number(r.rating),
  };
}

// The name on a card: a professional's real name, a listener's nickname.
export function hostName(card: Pick<HostCard, 'kind' | 'fullName' | 'nickname'>): string {
  return card.kind === 'professional' && card.fullName ? card.fullName : card.nickname;
}

export const BADGE: Record<HostKind, string> = { listener: 'Trained listener', professional: 'Professional' };

// "Free", "₦15,000 · 30 min", or "First session free".
export function priceWords(card: Pick<HostCard, 'priceNaira' | 'minutes' | 'freeFirst'>): string {
  if (card.priceNaira === 0) return `Free · ${card.minutes} min`;
  const price = `₦${card.priceNaira.toLocaleString('en-NG')} · ${card.minutes} min`;
  return card.freeFirst ? `${price} · first session free` : price;
}

export async function listOneOnOneHosts(): Promise<HostCard[]> {
  const { data, error } = await supabase.rpc('list_one_on_one_hosts');
  if (error) throw error;
  return ((data ?? []) as CardRow[]).map(toCard);
}

export async function hostCard(userId: string): Promise<HostCard | null> {
  const { data, error } = await supabase.rpc('host_card', { p_user: userId });
  if (error) throw error;
  const row = ((data ?? []) as CardRow[])[0];
  return row ? toCard(row) : null;
}

export async function notifyWhenHostOn(): Promise<void> {
  const { error } = await supabase.rpc('support_notify_me');
  if (error) throw error;
}

// --- one-on-one ---
export class OneOnOneError extends Error {
  constructor(public code: 'not_available' | 'already_waiting' | 'too_many' | 'payment_needed' | 'adults_only' | 'other') {
    super(code);
  }
}

function codeOf(message: string): OneOnOneError['code'] {
  for (const code of ['not_available', 'already_waiting', 'too_many', 'payment_needed'] as const) {
    if (message.includes(code)) return code;
  }
  return 'other';
}

// Through the room server, so the host's phone gets an alert too.
export async function requestOneOnOne(hostId: string): Promise<string> {
  try {
    const data = await call<{ id: string }>({ action: 'one_on_one_request', hostId });
    return data.id;
  } catch (e) {
    if (e instanceof Error && e.message === 'adults_only') throw new OneOnOneError('adults_only');
    throw new OneOnOneError(codeOf(e instanceof Error ? e.message : ''));
  }
}

export type MyRequest = {
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  roomId: string | null;
  hostNickname: string;
  minutes: number;
  endsAt: string | null;
};

export async function myRequest(id: string): Promise<MyRequest | null> {
  const { data, error } = await supabase.rpc('my_one_on_one', { p_id: id });
  if (error) throw error;
  const r = ((data ?? []) as { status: MyRequest['status']; room_id: string | null; host_nickname: string; minutes: number; ends_at: string | null }[])[0];
  return r ? { status: r.status, roomId: r.room_id, hostNickname: r.host_nickname, minutes: r.minutes, endsAt: r.ends_at } : null;
}

export async function cancelRequest(id: string): Promise<void> {
  await supabase.rpc('cancel_one_on_one', { p_id: id });
}

export async function rateSession(id: string, rating: number | null, helpful: boolean | null): Promise<void> {
  const { error } = await supabase.rpc('rate_one_on_one', { p_id: id, p_rating: rating, p_helpful: helpful });
  if (error) throw error;
}

// --- hosts ---
export type HostRequest = { id: string; nickname: string; minutes: number; priceNaira: number; createdAt: string };

export async function hostRequests(): Promise<HostRequest[]> {
  const { data, error } = await supabase.rpc('host_requests');
  if (error) throw error;
  return ((data ?? []) as { id: string; nickname: string; minutes: number; price_naira: number; created_at: string }[]).map((r) => ({
    id: r.id,
    nickname: r.nickname,
    minutes: r.minutes,
    priceNaira: r.price_naira,
    createdAt: r.created_at,
  }));
}

// Yes opens the private room; returns its id. No returns null.
export async function respondToRequest(id: string, accept: boolean): Promise<string | null> {
  const { data, error } = await supabase.rpc('respond_one_on_one', { p_id: id, p_accept: accept });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export type HostStatus = {
  isHost: boolean;
  application: { status: 'pending' | 'approved' | 'needs_changes' | 'rejected'; kind: HostKind; note: string | null } | null;
  profile: {
    kind: HostKind;
    intro: string;
    topics: string[];
    languages: string[];
    offers: boolean;
    minutes: number;
    price: number;
    freeFirst: boolean;
    online: boolean;
  } | null;
  hosted: number;
  trusted: boolean;
};

export async function myHostStatus(): Promise<HostStatus> {
  const { data, error } = await supabase.rpc('my_host_status');
  if (error) throw error;
  return data as HostStatus;
}

export async function setOnline(on: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_host_online', { p_on: on });
  if (error) throw error;
}

export async function updateHostProfile(p: {
  intro: string;
  topics: string[];
  languages: string[];
  offers: boolean;
  minutes: number;
  price: number;
  freeFirst: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('update_my_host_profile', {
    p_intro: p.intro,
    p_topics: p.topics,
    p_languages: p.languages,
    p_offers: p.offers,
    p_minutes: p.minutes,
    p_price: p.price,
    p_free_first: p.freeFirst,
  });
  if (error) throw error;
}

export type Application = {
  kind: HostKind;
  intro: string;
  topics: string[];
  languages: string[];
  why: string;
  fullName?: string;
  credential?: string;
  issuingBody?: string;
  licenceNumber?: string;
};

export async function submitApplication(a: Application): Promise<void> {
  const { error } = await supabase.rpc('submit_host_application', {
    p_kind: a.kind,
    p_intro: a.intro,
    p_topics: a.topics,
    p_languages: a.languages,
    p_why: a.why,
    p_full_name: a.fullName ?? null,
    p_credential: a.credential ?? null,
    p_issuing_body: a.issuingBody ?? null,
    p_licence_number: a.licenceNumber ?? null,
    p_training_passed: true,
    p_agreed: true,
  });
  if (error) throw error;
}

export const TOPICS = ['Loneliness', 'Stress', 'Relationships', 'Grief', 'Work', 'Family', 'Faith', 'Money worries', 'Exams'];
export const LANGUAGES = ['English', 'Pidgin', 'Igbo', 'Yoruba', 'Hausa', 'French'];
