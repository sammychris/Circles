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

// A friendly first check of a room title. Titles are shown to strangers, so no numbers or links.
export function titleProblem(input: string): TitleProblem {
  const title = input.replace(/\s+/g, ' ').trim();
  const length = Array.from(title).length;
  if (length < 3) return 'tooShort';
  if (length > TITLE_MAX) return 'tooLong';
  if (/[0-9]{7,}/.test(title.replace(/[\s.\-()+]/g, ''))) return 'number';
  if (/(https?:|www\.|\.(com|ng|net|org|io|me|ly|co)\b|@[a-z0-9_]{3,})/i.test(title)) return 'link';
  if (/(circles|official|admin|moderator|someone to talk to|crisis|helpline|hotline)/i.test(title)) return 'reserved';
  return null;
}

export const TITLE_PROBLEM_TEXT: Record<Exclude<TitleProblem, null>, string> = {
  tooShort: 'Give it a name of at least 3 characters.',
  tooLong: `Use ${TITLE_MAX} characters or fewer.`,
  number: 'Leave phone numbers out. Everyone can see the name.',
  link: 'Leave out web links and @names. Everyone can see the name.',
  reserved: 'That name could be mistaken for the Circles team or a support room. Pick another.',
};
