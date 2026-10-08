// Small checks shared by the sign-up screens. The database repeats the important ones (18+, nickname),
// so these are for quick, friendly messages, not for safety.

export const ADULT_AGE = 18;
export const NICKNAME_MAX = 20;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// Email codes are 6 digits (some Supabase projects use 8).
export function cleanCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 8);
}

export function isCodeComplete(code: string): boolean {
  return code.length >= 6;
}

// Returns a real calendar date, or null for things like 31 February.
export function parseDateOfBirth(day: string, month: string, year: string, today = new Date()): Date | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (date.getTime() > today.getTime()) return null;
  return date;
}

export function isAdult(dob: Date, today = new Date()): boolean {
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - ADULT_AGE, today.getUTCMonth(), today.getUTCDate()));
  return dob.getTime() <= cutoff.getTime();
}

// "2026-10-08" style, as the database wants it.
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type NicknameProblem = 'tooShort' | 'tooLong' | 'badCharacters' | 'looksLikeNumber' | null;

export function nicknameProblem(input: string): NicknameProblem {
  const name = input.trim();
  if (name.length < 2) return 'tooShort';
  if (name.length > NICKNAME_MAX) return 'tooLong';
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'badCharacters';
  if (/[0-9]{7,}/.test(name)) return 'looksLikeNumber';
  return null;
}

export const NICKNAME_PROBLEM_TEXT: Record<Exclude<NicknameProblem, null>, string> = {
  tooShort: 'Use at least 2 characters.',
  tooLong: `Use ${NICKNAME_MAX} characters or fewer.`,
  badCharacters: 'Use only letters, numbers and _ (no spaces).',
  looksLikeNumber: "That looks like a phone number. Pick something that isn't.",
};

// supabase-js reports a dropped connection as a failed fetch rather than a status code.
export function looksOffline(message: string | undefined): boolean {
  return !!message && /network request failed|failed to fetch|fetch failed/i.test(message);
}
