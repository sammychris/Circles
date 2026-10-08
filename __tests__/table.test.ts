import { acceptItem, allowedKinds, nextTurn, tally, findLink, keepsTable, linkSite, parseVideoLink, videoPositionNow, type TableItem } from '../src/table/model';

const ada = { id: 'ada', nickname: 'Ada_K' };
const PHOTOS = 'https://x.supabase.co/storage/v1/object/sign/table/';

describe('the table', () => {
  it('only allows notes in support rooms', () => {
    expect(allowedKinds('support')).toEqual(['note']);
    expect(acceptItem({ id: 'i1', at: 1, kind: 'video', video: { provider: 'youtube', id: 'dQw4w9WgXcQ' } }, ada, 'support', PHOTOS)).toBeNull();
    expect(acceptItem({ id: 'i1', at: 1, kind: 'screen' }, ada, 'support', PHOTOS)).toBeNull();
    expect(acceptItem({ id: 'i1', at: 1, kind: 'note', text: 'hello' }, ada, 'support', PHOTOS)?.kind).toBe('note');
  });

  it('reads YouTube and Vimeo links, and nothing else', () => {
    expect(parseVideoLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoLink('youtu.be/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoLink('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoLink('https://vimeo.com/76979871')).toEqual({ provider: 'vimeo', id: '76979871' });
    expect(parseVideoLink('https://player.vimeo.com/video/76979871')).toEqual({ provider: 'vimeo', id: '76979871' });
    expect(parseVideoLink('https://some-movie-site.ng/watch/123456')).toBeNull();
    expect(parseVideoLink('https://youtube.com.evil.ng/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('shows links by site name only', () => {
    expect(findLink('see https://www.bbc.com/news/abc, then talk')).toBe('https://www.bbc.com/news/abc');
    expect(linkSite('https://www.bbc.com/news/abc')).toBe('bbc.com');
    expect(findLink('no link here')).toBeNull();
  });

  it('always names the real sender, and only accepts photos from their own storage folder', () => {
    const item = acceptItem({ id: 'i1', at: 1, kind: 'note', text: 'hi', by: 'someone-else', byName: 'Circles_Team' }, ada, 'talk', PHOTOS);
    expect(item?.by).toBe('ada');
    expect(item?.byName).toBe('Ada_K');
    const adaUser = { id: '11111111-2222-3333-4444-555555555555', nickname: 'Ada_K' };
    const own = `${adaUser.id}/room-1/abc123-0.jpg`;
    const other = '99999999-2222-3333-4444-555555555555/room-1/abc123-1.jpg';
    const photos = acceptItem(
      { id: 'i2', at: 1, kind: 'photos', photos: [{ p: own, t: 'tok.en_123456' }, { p: other, t: 'tok.en_123456' }, { p: '../x.jpg', t: 'tok.en_123456' }] },
      adaUser,
      'talk',
      PHOTOS,
    );
    expect(photos?.kind === 'photos' && photos.photos).toEqual([{ path: own, url: `${PHOTOS}${own}?token=tok.en_123456` }]);
  });

  it("can't claim to have been first by a long way", () => {
    const now = 1_000_000;
    expect(acceptItem({ id: 'i1', at: 0, kind: 'note', text: 'hi' }, ada, 'talk', PHOTOS, now)?.at).toBe(now - 10_000);
    expect(acceptItem({ id: 'i1', at: now + 99_999, kind: 'note', text: 'hi' }, ada, 'talk', PHOTOS, now)?.at).toBe(now);
  });

  it('keeps the first item when two arrive together, and lets a presenter replace their own', () => {
    const first = { id: 'a', by: 'bayo', byName: 'Bayo', at: 100, kind: 'screen' } as TableItem;
    const later = { id: 'b', by: 'ada', byName: 'Ada', at: 200, kind: 'screen' } as TableItem;
    expect(keepsTable(first, later)).toBe(false);
    expect(keepsTable(later, first)).toBe(true);
    expect(keepsTable(first, { ...first, id: 'c', at: 300 })).toBe(true);
    expect(keepsTable(null, later)).toBe(true);
  });

  it('works out where the video is now', () => {
    expect(videoPositionNow({ seq: 1, playing: true, position: 10, sentAt: 1000 }, 6000)).toBe(15);
    expect(videoPositionNow({ seq: 1, playing: false, position: 10, sentAt: 1000 }, 6000)).toBe(10);
  });
});

jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));
jest.mock('../src/lib/supabase', () => ({ supabase: {} }));

describe('take turns and quiz', () => {
  it('passes the turn to the next person still here', () => {
    expect(nextTurn(['a', 'b', 'c'], 0, ['a', 'b', 'c'])).toBe(1);
    expect(nextTurn(['a', 'b', 'c'], 0, ['a', 'c'])).toBe(2);
    expect(nextTurn(['a', 'b', 'c'], 2, ['a', 'b', 'c'])).toBe(0);
    expect(nextTurn(['a'], 0, ['a'])).toBe(0);
  });

  it('counts quiz answers without names, one per person', () => {
    const answers = new Map([['a', 0], ['b', 1], ['c', 1], ['d', 9]]);
    expect(tally(answers, 3)).toEqual([1, 2, 0]);
  });

  it('checks quiz and turn items from other phones', () => {
    expect(acceptItem({ id: 'q', at: 1, kind: 'quiz', question: 'Best jollof?', answers: ['Lagos'] }, ada, 'talk', PHOTOS)).toBeNull();
    const quiz = acceptItem({ id: 'q', at: 1, kind: 'quiz', question: 'Best jollof?', answers: ['Lagos', 'Accra', 'x', 'y', 'z'], correct: 7 }, ada, 'talk', PHOTOS);
    expect(quiz?.kind === 'quiz' && quiz.answers.length).toBe(4);
    expect(quiz?.kind === 'quiz' && quiz.correct).toBeNull();
    expect(acceptItem({ id: 't', at: 1, kind: 'turns', topic: 'Stories', minutes: 3 }, ada, 'support', PHOTOS)).toBeNull();
    const turns = acceptItem({ id: 't', at: 1, kind: 'turns', topic: 'Stories', minutes: 99 }, ada, 'talk', PHOTOS);
    expect(turns?.kind === 'turns' && turns.minutes).toBe(2);
  });
});

describe('photo upload helpers', () => {
  it('turns base64 into the same bytes as the standard decoder', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { base64ToBytes } = require('../src/table/photos') as typeof import('../src/table/photos');
    for (const text of ['', 'a', 'ab', 'abc', 'hello world', 'Ọmọ 😄']) {
      const b64 = Buffer.from(text, 'utf8').toString('base64');
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(Buffer.from(text, 'utf8')));
    }
  });
});
