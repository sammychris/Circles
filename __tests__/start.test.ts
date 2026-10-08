import { readFileSync } from 'fs';
import { join } from 'path';
import { TOPICS, titleProblem } from '../src/rooms/start';

describe('starting a room', () => {
  it('checks titles like the room server does', () => {
    expect(titleProblem('Arsenal fans')).toBeNull();
    expect(titleProblem('Hi')).toBe('tooShort');
    expect(titleProblem('x'.repeat(41))).toBe('tooLong');
    expect(titleProblem('Call 0803 123 4567')).toBe('number');
    expect(titleProblem('see www.site.com')).toBe('link');
    expect(titleProblem('Circles Official')).toBe('reserved');
    expect(titleProblem('Need someone to talk to?')).toBe('reserved');
  });

  it('offers the same topics the room server accepts', () => {
    const server = readFileSync(join(__dirname, '..', 'supabase', 'functions', 'livekit-token', 'index.ts'), 'utf8');
    const list = server.match(/const TOPICS = \[([^\]]+)\]/)?.[1] ?? '';
    const serverTopics = list.split(',').map((t) => t.trim().replace(/'/g, ''));
    expect(TOPICS.map((t) => t.id)).toEqual(serverTopics);
  });
});
