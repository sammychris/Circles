// Learn together (docs/design/pages/learn.md, docs/screens/14 and 15): free practice rooms by language or
// skill, and level. The room server checks the same lists; keep them in step.

export type LearnLevel = 'beginner' | 'getting_there' | 'fluent';
export type LearnSubject = { id: string; name: string; kind: 'language' | 'skill'; greeting?: string; short?: string; line: string };

export const LANGUAGES: LearnSubject[] = [
  { id: 'igbo', name: 'Igbo', kind: 'language', greeting: 'Kedu', line: 'Kedu! Practise speaking with people learning at your level.' },
  { id: 'yoruba', name: 'Yoruba', kind: 'language', greeting: 'Bawo ni', line: 'Bawo ni! Practise speaking with people learning at your level.' },
  { id: 'hausa', name: 'Hausa', kind: 'language', greeting: 'Sannu', line: 'Sannu! Practise speaking with people learning at your level.' },
  { id: 'pidgin', name: 'Pidgin', kind: 'language', greeting: 'How far', line: 'How far! Practise speaking with people learning at your level.' },
  { id: 'french', name: 'French', kind: 'language', greeting: 'Bonjour', line: 'Bonjour! Practise speaking with people learning at your level.' },
  { id: 'english', name: 'English', kind: 'language', greeting: 'Hello', line: 'Hello! Practise speaking with people learning at your level.' },
];

export const SKILLS: LearnSubject[] = [
  { id: 'public_speaking', name: 'Public speaking', kind: 'skill', short: 'Everyone gets a turn', line: 'Practise speaking up with people at your level. Everyone gets a turn.' },
  { id: 'coding', name: 'Coding basics', kind: 'skill', short: 'Solve small problems', line: 'Solve small coding problems together, out loud, with people at your level.' },
];

export const SUBJECTS = [...LANGUAGES, ...SKILLS];

// The Learn page's three categories.
export type LearnGroup = 'nigerian' | 'world' | 'skills';
export const LEARN_GROUPS: { id: LearnGroup; label: string }[] = [
  { id: 'nigerian', label: 'Nigerian languages' },
  { id: 'world', label: 'Other languages' },
  { id: 'skills', label: 'Skills' },
];
const NIGERIAN = ['igbo', 'yoruba', 'hausa', 'pidgin'];
export function learnGroup(s: LearnSubject): LearnGroup {
  return s.kind === 'skill' ? 'skills' : NIGERIAN.includes(s.id) ? 'nigerian' : 'world';
}

// Not open yet (Sammy, 2026-10-11): shown greyed out as "Coming soon". Front end only, so the room
// server doesn't know them; to open one, move it into LANGUAGES or SKILLS and the server's list.
export const SOON: Record<LearnGroup, string[]> = {
  nigerian: ['Efik', 'Tiv', 'Urhobo', 'Edo', 'Ijaw', 'Fulfulde'],
  world: ['Spanish', 'Arabic', 'Swahili', 'Portuguese', 'German', 'Mandarin'],
  skills: ['Job interviews', 'Pitch your idea', 'Storytelling', 'Exam prep', 'Money basics', 'Negotiation'],
};

// Ways to learn. Only Practise exists; the rest show greyed out until they're built.
export const FORMATS: { id: string; label: string; ready: boolean }[] = [
  { id: 'practise', label: 'Practise', ready: true },
  { id: 'quiz', label: 'Quiz', ready: false },
  { id: 'challenge', label: 'Challenge', ready: false },
  { id: 'debate', label: 'Debate', ready: false },
];

export const LEVELS: { id: LearnLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'getting_there', label: 'Getting there' },
  { id: 'fluent', label: 'Fluent' },
];

export function subjectById(id: string | null | undefined): LearnSubject | null {
  return SUBJECTS.find((s) => s.id === id) ?? null;
}

export function levelLabel(id: string | null | undefined): string | null {
  return LEVELS.find((l) => l.id === id)?.label ?? null;
}

// "What's your Igbo like?" / "How's your public speaking?"
export function levelQuestion(subject: LearnSubject): string {
  return subject.kind === 'language' ? `What's your ${subject.name} like?` : `How's your ${subject.name.toLowerCase()}?`;
}

export const LEARN_CAPACITY = 7;
