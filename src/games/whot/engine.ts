// Whot (play.md › Whot), with the usual Nigerian rules. Our own code, no outside licence.
// 54 cards: circles and triangles 1-5, 7, 8, 10-14; crosses and squares 1, 2, 3, 5, 7, 10, 11, 13, 14;
// stars 1-5, 7, 8; five Whot 20s. Match the top card's shape or number, or play a Whot 20 any time
// and call the shape.
//   1 Hold on: play again.   2 Pick two: the next player picks 2 and misses their go.
//   5 Pick three: the same with 3.   8 Suspension: the next player misses their go.
//   14 General market: everyone else picks 1, and you play again.   20 Whot: call a shape.
// No card to play? Go to market: pick one, and your go ends. First to finish their cards wins.
// Each hand is sent only to its owner (tableGame.ts); everyone sees how many cards the others hold.

import { shuffle, type TableGame } from '../tableGame';

export type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star';
export const SHAPES: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
// A card is "shape-number", or "whot-20".
export type Card = string;

const NUMBERS: Record<Shape, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};

export const HAND_SIZE = 5;
// Someone who hasn't played for this long goes to market for the room, so the game never stalls.
export const TURN_SECONDS = 60;

export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const shape of SHAPES) for (const n of NUMBERS[shape]) deck.push(`${shape}-${n}`);
  for (let i = 0; i < 5; i++) deck.push('whot-20');
  return deck;
}

export function parse(card: Card): { shape: Shape | 'whot'; n: number } {
  const [shape, n] = card.split('-');
  return { shape: shape as Shape | 'whot', n: Number(n) };
}

export type WhotGame = {
  players: string[];
  hands: Record<string, Card[]>;
  market: Card[];
  pile: Card[];
  // After a Whot 20: the shape the next player must play.
  need: Shape | null;
  turn: number;
  turnAt: number;
  winner: string | null;
  last: string;
  startedBy: string;
  names: Record<string, string>;
};

export type WhotMove = { type: 'play'; card: Card; shape?: Shape } | { type: 'market' };

export type WhotPublic = Omit<WhotGame, 'hands' | 'market'> & { counts: Record<string, number>; market: number };

const top = (g: WhotGame) => g.pile[g.pile.length - 1];

export function canPlay(g: Pick<WhotGame, 'pile' | 'need'>, card: Card): boolean {
  const c = parse(card);
  if (c.shape === 'whot') return true;
  const t = parse(g.pile[g.pile.length - 1]);
  if (g.need) return c.shape === g.need;
  return c.shape === t.shape || c.n === t.n;
}

// Takes `n` cards from the market. When it runs out, the pile (all but the top card) is shuffled to
// make a new market, so nobody can tell what comes next.
function draw(g: WhotGame, n: number, random: () => number = Math.random): { g: WhotGame; cards: Card[] } {
  let market = [...g.market];
  let pile = [...g.pile];
  const cards: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (market.length === 0 && pile.length > 1) {
      market = shuffle(pile.slice(0, -1), random);
      pile = pile.slice(-1);
    }
    const card = market.shift();
    if (!card) break;
    cards.push(card);
  }
  return { g: { ...g, market, pile }, cards };
}

function nextIndex(g: WhotGame, from: number, steps = 1): number {
  return (from + steps) % g.players.length;
}

function name(g: WhotGame, id: string): string {
  return g.names[id] ?? 'Someone';
}

export const whot: TableGame<WhotGame> = {
  id: 'whot',
  name: 'Whot',
  line: '2 to 6 people. Each hand is private',
  min: 2,
  max: 6,
  setup(players, startedBy, random, names = {}) {
    const deck = shuffle(fullDeck(), random);
    const hands: Record<string, Card[]> = {};
    for (const p of players) hands[p] = deck.splice(0, HAND_SIZE);
    // The first card on the pile is an ordinary one.
    const first = deck.findIndex((c) => ![1, 2, 5, 8, 14, 20].includes(parse(c).n));
    const [start] = deck.splice(first, 1);
    return {
      players,
      hands,
      market: deck,
      pile: [start],
      need: null,
      turn: 0,
      turnAt: Date.now(),
      winner: null,
      last: 'Match the shape or the number',
      startedBy,
      names,
    };
  },
  apply(g0, raw, by, now) {
    const g = g0;
    if (g.winner || g.players[g.turn] !== by) return null;
    const m = raw as Partial<WhotMove> & Record<string, unknown>;
    if (m?.type === 'market') {
      const d = draw(g, 1);
      // No cards left anywhere: whoever holds the fewest wins this game.
      if (d.cards.length === 0) {
        const fewest = [...g.players].sort((a, b) => (g.hands[a]?.length ?? 0) - (g.hands[b]?.length ?? 0))[0];
        return { ...g, turnAt: now, winner: fewest, last: `The market is finished. ${name(g, fewest)} has the fewest cards and wins` };
      }
      const hands = { ...d.g.hands, [by]: [...(d.g.hands[by] ?? []), ...d.cards] };
      return { ...d.g, hands, turn: nextIndex(g, g.turn), turnAt: now, last: `${name(g, by)} went to market` };
    }
    if (m?.type !== 'play' || typeof m.card !== 'string') return null;
    const hand = g.hands[by] ?? [];
    const at = hand.indexOf(m.card);
    if (at < 0 || !canPlay(g, m.card)) return null;
    const card = parse(m.card);
    if (card.shape === 'whot' && !SHAPES.includes(m.shape as Shape)) return null;
    let next: WhotGame = {
      ...g,
      hands: { ...g.hands, [by]: hand.filter((_, i) => i !== at) },
      pile: [...g.pile, m.card],
      need: card.shape === 'whot' ? (m.shape as Shape) : null,
      turnAt: now,
    };
    if (next.hands[by].length === 0) return { ...next, winner: by, last: `${name(g, by)} played their last card: check up!` };
    const after = nextIndex(g, g.turn);
    const who = g.players[after];
    if (card.n === 1) return { ...next, last: `${name(g, by)}: hold on, plays again` };
    if (card.n === 2 || card.n === 5) {
      const n = card.n === 2 ? 2 : 3;
      const d = draw(next, n);
      next = { ...d.g, hands: { ...d.g.hands, [who]: [...d.g.hands[who], ...d.cards] } };
      return { ...next, turn: nextIndex(g, g.turn, 2), last: `${name(g, who)} picks ${n === 2 ? 'two' : 'three'}` };
    }
    if (card.n === 8) return { ...next, turn: nextIndex(g, g.turn, 2), last: `${name(g, who)} is suspended` };
    if (card.n === 14) {
      for (const p of g.players) {
        if (p === by) continue;
        const d = draw(next, 1);
        next = { ...d.g, hands: { ...d.g.hands, [p]: [...d.g.hands[p], ...d.cards] } };
      }
      return { ...next, last: `General market! ${name(g, by)} plays again` };
    }
    if (card.shape === 'whot') return { ...next, turn: after, last: `${name(g, by)} wants ${m.shape}s` };
    return { ...next, turn: after, last: `${name(g, by)} played ${card.shape} ${card.n}` };
  },
  publicView(g): WhotPublic {
    const counts: Record<string, number> = {};
    for (const p of g.players) counts[p] = g.hands[p]?.length ?? 0;
    const { hands: _hands, market, ...rest } = g;
    return { ...rest, counts, market: market.length };
  },
  secretFor(g, person) {
    return g.hands[person] ?? null;
  },
  tick(g, now) {
    if (g.winner || now - g.turnAt < TURN_SECONDS * 1000) return null;
    // Too long: they go to market, and the game moves on.
    return whot.apply(g, { type: 'market' }, g.players[g.turn], now);
  },
  leave(g, person) {
    if (!g.players.includes(person)) return g;
    const players = g.players.filter((p) => p !== person);
    const leaving = g.players.indexOf(person);
    const market = [...g.market, ...(g.hands[person] ?? [])];
    const { [person]: _gone, ...hands } = g.hands;
    let turn = g.turn > leaving ? g.turn - 1 : g.turn;
    if (turn >= players.length) turn = 0;
    if (!g.winner && players.length === 1) return { ...g, players, hands, market, turn: 0, winner: players[0], last: `${name(g, players[0])} won: everyone else left` };
    // If it was their go, the next person gets a full minute.
    return { ...g, players, hands, market, turn, turnAt: leaving === g.turn ? Date.now() : g.turnAt };
  },
};

export { top };
