// Games on the Table (play.md, activities.md). The person who starts a game holds it on their phone:
// players send their moves there, it checks them with the game's own rules, and tells everyone the
// result. Hidden things (Whot hands, Mafia roles) are sent only to the person they belong to.
// Nothing about a game is saved: no points, streaks or rankings (CLAUDE.md, Never list).

export type GameId = 'draughts' | 'chess' | 'whot' | 'mafia';
export const GAME_IDS: GameId[] = ['draughts', 'chess', 'whot', 'mafia'];
export const GAME_NAMES: Record<GameId, string> = { draughts: 'Draughts', chess: 'Chess in teams', whot: 'Whot', mafia: 'Mafia' };

export interface TableGame<G> {
  id: GameId;
  name: string;
  line: string;
  min: number;
  max: number;
  // A fresh game for the people in the room.
  setup(players: string[], startedBy: string, random: () => number, names?: Record<string, string>): G;
  // A move from one person, checked by the rules. The new game, or null when it isn't allowed.
  apply(g: G, move: unknown, by: string, now: number): G | null;
  // What everyone may see.
  publicView(g: G): unknown;
  // What one person may see privately (their hand, their role), or null.
  secretFor?(g: G, person: string): unknown;
  // Changes that come with time (a timer running out), checked every second on the starter's phone.
  tick?(g: G, now: number, here: string[]): G | null;
  // Someone left the room.
  leave?(g: G, person: string): G;
}

export function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type Side = 'sun' | 'sky';
export const SIDE_NAME: Record<Side, string> = { sun: 'Team Sun', sky: 'Team Sky' };
export const otherSide = (s: Side): Side => (s === 'sun' ? 'sky' : 'sun');

// Two teams at random, as for Ludo (play.md › Pick teams).
export function splitTeams(players: string[], random: () => number): Record<Side, string[]> {
  const mixed = shuffle(players, random);
  const half = Math.ceil(mixed.length / 2);
  return { sun: mixed.slice(0, half), sky: mixed.slice(half) };
}

export function sideOf(teams: Record<Side, string[]>, person: string): Side | null {
  if (teams.sun.includes(person)) return 'sun';
  if (teams.sky.includes(person)) return 'sky';
  return null;
}
