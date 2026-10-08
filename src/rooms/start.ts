// Start something: what a person can choose when they start their own room. The room server
// (supabase/functions/livekit-token) checks the same rules; keep the two in step.

export type Topic = 'football' | 'music' | 'movies' | 'faith' | 'relationships' | 'work' | 'money' | 'politics' | 'tech' | 'other';

export const TOPICS: { id: Topic; label: string }[] = [
  { id: 'football', label: 'Football' },
  { id: 'music', label: 'Music' },
  { id: 'movies', label: 'Movies and shows' },
  { id: 'faith', label: 'Faith' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'work', label: 'Work and school' },
  { id: 'money', label: 'Money' },
  { id: 'politics', label: 'Politics' },
  { id: 'tech', label: 'Tech' },
  { id: 'other', label: 'Something else' },
];

export function topicLabel(topic: string | null | undefined): string | null {
  return TOPICS.find((t) => t.id === topic)?.label ?? null;
}

// Rooms hold at least 3 to start; these are the sizes people can pick.
export const ROOM_SIZES = [4, 5, 6] as const;
export const TITLE_MAX = 40;

export type TitleProblem = 'tooShort' | 'tooLong' | 'number' | 'link' | 'reserved' | null;

// Keep in step with the room server's titleBreaksRules (__tests__/start.test.ts checks both).
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

function titleBreaksRules(title: string): 'number' | 'link' | 'reserved' | null {
  // Phone numbers: at least 7 digits once everything but letters and digits is taken out.
  if (/\p{Nd}{7,}/u.test(title.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, ''))) return 'number';
  if (/(https?:|www\.|\.(com|ng|net|org|io|me|ly|co)\b|@[a-z0-9_]{3,})/i.test(title)) return 'link';
  const plain = Array.from(title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
    .map((ch) => LOOKALIKES[ch] ?? ch)
    .join('')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  const joined = plain.replace(/ /g, '');
  if (RESERVED_JOINED.some((word) => joined.includes(word)) || RESERVED_WORDS.test(plain)) return 'reserved';
  return null;
}

// A friendly first check of a room title. The room server checks the same rules.
export function titleProblem(input: string): TitleProblem {
  const title = input.replace(/\s+/g, ' ').trim();
  const length = Array.from(title).length;
  if (length < 3) return 'tooShort';
  if (length > TITLE_MAX) return 'tooLong';
  return titleBreaksRules(title);
}

export const TITLE_PROBLEM_TEXT: Record<Exclude<TitleProblem, null>, string> = {
  tooShort: 'Give it a name of at least 3 characters.',
  tooLong: `Use ${TITLE_MAX} characters or fewer.`,
  number: 'Leave phone numbers out. Everyone can see the name.',
  link: 'Leave out web links and @names. Everyone can see the name.',
  reserved: 'That name could be mistaken for the Circles team or a support room, which always has a trained host. Pick another.',
};
