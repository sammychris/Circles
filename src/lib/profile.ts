import { supabase } from './supabase';
import type { AvatarSymbol } from './avatars';

// Me: your nickname and look, which alerts you get, and Report a problem (docs/me-page-spec.md).

export class ProfileError extends Error {
  constructor(public code: 'nickname_taken' | 'invalid_nickname' | 'too_soon' | 'reserved' | 'other') {
    super(code);
  }
}

export async function updateMyProfile(nickname: string, tint: number | null, symbol: AvatarSymbol | null): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', { p_nickname: nickname, p_tint: tint, p_symbol: symbol });
  if (!error) return;
  const code = error.message.includes('reserved_nickname')
    ? 'reserved'
    : ((['nickname_taken', 'invalid_nickname', 'too_soon'] as const).find((c) => error.message.includes(c)) ?? 'other');
  throw new ProfileError(code);
}

export type AlertPrefs = { invitations: boolean; hostRequests: boolean };

export async function myAlertPrefs(): Promise<AlertPrefs> {
  const { data, error } = await supabase.from('notification_prefs').select('invitations, host_requests').maybeSingle();
  if (error) throw error;
  return { invitations: data?.invitations ?? true, hostRequests: data?.host_requests ?? true };
}

export async function setAlertPrefs(p: AlertPrefs): Promise<void> {
  const { error } = await supabase.rpc('set_notification_prefs', { p_invitations: p.invitations, p_host_requests: p.hostRequests });
  if (error) throw error;
}

export async function sendFeedback(kind: 'problem' | 'question' | 'idea', body: string): Promise<'sent' | 'too_many'> {
  const { error } = await supabase.rpc('send_feedback', { p_kind: kind, p_body: body });
  if (!error) return 'sent';
  if (error.message.includes('too_many')) return 'too_many';
  throw error;
}
