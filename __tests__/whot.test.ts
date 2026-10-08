import { canPlay, fullDeck, whot, type WhotGame } from '../src/games/whot/engine';

const base = (hands: Record<string, string[]>, top: string, market: string[] = ['star-3', 'star-4', 'star-5', 'cross-7', 'cross-10']): WhotGame => ({
  players: Object.keys(hands),
  hands,
  market,
  pile: [top],
  need: null,
  turn: 0,
  turnAt: 0,
  winner: null,
  last: '',
  startedBy: 'a',
  names: { a: 'Ada', b: 'Bayo', c: 'Chi' },
});

describe('whot', () => {
  it('has 54 cards and deals 5 each, with an ordinary first card', () => {
    expect(fullDeck()).toHaveLength(54);
    const g = whot.setup(['a', 'b', 'c'], 'a', () => 0.42, {});
    expect(Object.values(g.hands).every((h) => h.length === 5)).toBe(true);
    expect(g.pile).toHaveLength(1);
    expect(g.market).toHaveLength(54 - 15 - 1);
  });

  it('matches shape or number, and Whot 20 any time', () => {
    const g = base({ a: [], b: [] }, 'circle-7');
    expect(canPlay(g, 'circle-3')).toBe(true);
    expect(canPlay(g, 'star-7')).toBe(true);
    expect(canPlay(g, 'star-3')).toBe(false);
    expect(canPlay(g, 'whot-20')).toBe(true);
  });

  it('only the player whose turn it is can play, and only cards they hold', () => {
    const g = base({ a: ['circle-3', 'star-4'], b: ['circle-4'] }, 'circle-7');
    expect(whot.apply(g, { type: 'play', card: 'circle-4' }, 'b', 1)).toBeNull();
    expect(whot.apply(g, { type: 'play', card: 'circle-4' }, 'a', 1)).toBeNull();
    const next = whot.apply(g, { type: 'play', card: 'circle-3' }, 'a', 1)!;
    expect(next.turn).toBe(1);
    expect(next.hands.a).toEqual(['star-4']);
  });

  it('pick two makes the next player pick and miss their go', () => {
    const g = base({ a: ['circle-2', 'star-4'], b: ['cross-1'], c: ['square-1'] }, 'circle-7');
    const next = whot.apply(g, { type: 'play', card: 'circle-2' }, 'a', 1)!;
    expect(next.hands.b).toHaveLength(3);
    expect(next.players[next.turn]).toBe('c');
  });

  it('Whot 20 calls a shape; general market feeds everyone else', () => {
    const g = base({ a: ['whot-20', 'circle-14', 'star-4'], b: ['cross-1'], c: ['square-1'] }, 'circle-7');
    expect(whot.apply(g, { type: 'play', card: 'whot-20' }, 'a', 1)).toBeNull();
    const called = whot.apply(g, { type: 'play', card: 'whot-20', shape: 'star' }, 'a', 1)!;
    expect(called.need).toBe('star');
    const market = whot.apply(g, { type: 'play', card: 'circle-14' }, 'a', 1)!;
    expect(market.hands.b).toHaveLength(2);
    expect(market.hands.c).toHaveLength(2);
    expect(market.turn).toBe(0);
  });

  it('first to finish wins; hands stay private', () => {
    const g = base({ a: ['circle-3'], b: ['cross-1'] }, 'circle-7');
    expect(whot.apply(g, { type: 'play', card: 'circle-3' }, 'a', 1)!.winner).toBe('a');
    const pub = whot.publicView(g) as Record<string, unknown>;
    expect(pub.hands).toBeUndefined();
    expect(pub.counts).toEqual({ a: 1, b: 1 });
    expect(whot.secretFor!(g, 'b')).toEqual(['cross-1']);
  });

  it('a slow player goes to market for the room, and a leaver hands their cards back', () => {
    const g = base({ a: ['circle-3'], b: ['cross-1'] }, 'circle-7');
    const timed = whot.tick!(g, 61_000, [])!;
    expect(timed.hands.a).toHaveLength(2);
    expect(timed.turn).toBe(1);
    expect(whot.leave!(g, 'b').winner).toBe('a');
  });
});
