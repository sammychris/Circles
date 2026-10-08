// Public settings only. Real secrets (LiveKit API secret) live in Supabase, never in the app.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '';
// Where the web version of Circles lives, for room links people can share (e.g. https://circles.expo.app).
// Empty until the web version is online: the Invite button stays hidden until then.
// Photos on the table are shared as signed links from our own storage. Phones only show photos whose
// link starts with this, so nobody can put a photo from somewhere else on the table.
export const PHOTO_URL_START = `${(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/sign/table/`;
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');

// Email is switched off for the open test (Sammy's decision). Turning this on shows "Add your email" and
// "I already have an account". Before that, do the email setup listed in docs/PROGRESS.md (Later).
export const EMAIL_ENABLED = false;

export const TEST_ROOM_ID = 'test-room';
export const ROOM_CAPACITY = 6;

// Test builds only: shows how long joining took and how good the connection is. Turn off before real users.
export const SHOW_TEST_NUMBERS = true;

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!LIVEKIT_URL) missing.push('EXPO_PUBLIC_LIVEKIT_URL');
  return missing;
}
