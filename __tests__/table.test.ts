import { acceptItem, allowedKinds, findLink, keepsTable, linkSite, parseVideoLink, videoPositionNow, type TableItem } from '../src/table/model';

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

  it('always names the real sender, and only accepts our own photo links', () => {
    const item = acceptItem({ id: 'i1', at: 1, kind: 'note', text: 'hi', by: 'someone-else', byName: 'Circles_Team' }, ada, 'talk', PHOTOS);
    expect(item?.by).toBe('ada');
    expect(item?.byName).toBe('Ada_K');
    const photos = acceptItem(
      { id: 'i2', at: 1, kind: 'photos', photos: [{ url: `${PHOTOS}a.jpg?token=x`, path: 'a.jpg' }, { url: 'https://evil.ng/b.jpg', path: 'b' }] },
      ada,
      'talk',
      PHOTOS,
    );
    expect(photos?.kind === 'photos' && photos.photos.length).toBe(1);
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
