import { supabase } from './supabase';

export type ReportReason =
  | 'danger'
  | 'sexual'
  | 'hate'
  | 'threats'
  | 'under18'
  | 'scam'
  | 'private_info'
  | 'other'
  | 'room';

// The order and wording from docs/design/pages/report-and-block.md.
export const REPORT_REASONS: { id: Exclude<ReportReason, 'room'>; title: string; line?: string }[] = [
  { id: 'danger', title: 'Someone may be in danger', line: 'They talked about hurting themselves or someone else.' },
  { id: 'sexual', title: 'Sexual or creepy', line: 'Sexual talk, asking for photos, or making someone uncomfortable.' },
  { id: 'hate', title: 'Hate or harassment', line: 'Insults, slurs or targeting someone.' },
  { id: 'threats', title: 'Threats or violence' },
  { id: 'under18', title: 'Seems under 18' },
  { id: 'scam', title: 'Scam, spam or selling' },
  { id: 'private_info', title: 'Sharing private information', line: "Someone's real name, number or location." },
  { id: 'other', title: 'Something else' },
];

export const REPORT_DETAILS_MAX = 500;

export type ReportTarget = { id: string; nickname: string } | 'room';

export async function submitReport(
  target: ReportTarget,
  roomId: string | null,
  reason: ReportReason,
  details: string,
): Promise<'sent' | 'merged'> {
  const person = target === 'room' ? null : target;
  const { data, error } = await supabase.rpc('submit_report', {
    p_reported: person?.id ?? null,
    p_reported_name: person?.nickname ?? null,
    p_room: roomId,
    p_reason: target === 'room' ? 'room' : reason,
    p_details: details,
  });
  if (error) throw error;
  return data === 'merged' ? 'merged' : 'sent';
}

export type Blocked = { id: string; nickname: string };

export async function blockPerson(me: string, person: Blocked): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker_id: me, blocked_id: person.id, blocked_nickname: person.nickname }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function unblockPerson(me: string, personId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', personId);
  if (error) throw error;
}

export async function listBlocked(): Promise<Blocked[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, blocked_nickname')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b) => ({ id: b.blocked_id as string, nickname: (b.blocked_nickname as string) ?? 'Someone' }));
}

export type Ban = { reason: string; until: string | null };

export async function myBan(): Promise<Ban | null> {
  const { data, error } = await supabase.rpc('my_ban');
  if (error) throw error;
  const row = (data as Ban[] | null)?.[0];
  return row ?? null;
}
