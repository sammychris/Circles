import { parseLink, roomLink } from '../src/lib/links';

describe('room links', () => {
  it('makes a link anyone can open', () => {
    expect(roomLink('https://circles.expo.app', 'abc-123', 'Ada_K')).toBe('https://circles.expo.app/?room=abc-123&by=Ada_K');
  });

  it('reads web links, app links and path links', () => {
    expect(parseLink('https://circles.expo.app/?room=abc-123&by=Ada_K')).toEqual({ roomId: 'abc-123', by: 'Ada_K' });
    expect(parseLink('circles://r/abc-123')).toEqual({ roomId: 'abc-123' });
    expect(parseLink('https://circles.expo.app/r/abc-123')).toEqual({ roomId: 'abc-123' });
  });

  it('opens the legal pages', () => {
    expect(parseLink('https://circles.expo.app/?page=privacy')).toEqual({ page: 'privacy' });
    expect(parseLink('https://circles.expo.app/terms')).toEqual({ page: 'terms' });
  });

  it('ignores anything that is not a real room id or nickname', () => {
    expect(parseLink('https://x.app/?room=<script>&by=Ada K')).toEqual({});
    expect(parseLink('not a link')).toEqual({});
    expect(parseLink(null)).toEqual({});
  });
});
