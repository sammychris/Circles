import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Profile = { nickname: string | null; dateOfBirth: string | null };

export type ProfileState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profile: Profile };

// The signed-in person's own nickname and date of birth. Row Level Security lets them read only their own rows.
export function useProfile(userId: string | null) {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  const reload = useCallback(async () => {
    if (!userId) return;
    const [profile, birth] = await Promise.all([
      supabase.from('profiles').select('nickname').eq('id', userId).maybeSingle(),
      supabase.from('birth_dates').select('date_of_birth').eq('id', userId).maybeSingle(),
    ]);
    if (profile.error || birth.error) {
      setState({ status: 'error' });
      return;
    }
    setState({
      status: 'ready',
      profile: { nickname: profile.data?.nickname ?? null, dateOfBirth: birth.data?.date_of_birth ?? null },
    });
  }, [userId]);

  useEffect(() => {
    setState({ status: 'loading' });
    void reload();
  }, [reload]);

  return { state, reload };
}
