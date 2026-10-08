// Mafia (play.md › Mafia). The person who starts it is the narrator, as in the real game: they don't
// play, and their phone deals the roles and runs the rounds. Our own code, no outside licence.
// Roles go only to their owner: Mafia, Doctor, Detective, Townsperson.
// Night (at most 20 seconds, everyone's mic paused and the reason shown): the Mafia picks someone, the
// Doctor picks someone to save, the Detective checks someone. Day: everyone talks and votes.
// "Out" players stay in the room, keep listening and can chat; they just can't vote. A vote never
// removes or mutes a real person (CLAUDE.md, Never list). Nothing is kept after the game.

import { shuffle, type TableGame } from '../tableGame';

export type Role = 'mafia' | 'doctor' | 'detective' | 'town';
export type Phase = 'night' | 'day' | 'over';

export const NIGHT_SECONDS = 20;
export const DAY_SECONDS = 150;
export const MIN_PLAYERS = 4;

export type MafiaGame = {
  narrator: string;
  players: string[];
  roles: Record<string, Role>;
  out: string[];
  phase: Phase;
  round: number;
  endsAt: number;
  // Night choices, on the narrator's phone only.
  night: { mafia: string | null; doctor: string | null; detective: string | null };
  // What the Detective learned, by round.
  checks: { target: string; mafia: boolean }[];
  // Day votes: person -> who they voted for ('skip' for nobody).
  votes: Record<string, string>;
  winner: 'mafia' | 'town' | null;
  last: string;
  names: Record<string, string>;
};

export type MafiaMove = { type: 'night'; target: string } | { type: 'vote'; target: string };

export type MafiaPublic = {
  narrator: string;
  players: string[];
  out: string[];
  phase: Phase;
  round: number;
  endsAt: number;
  // How many people have voted so far. Neither who voted nor the running count for each person is
  // shown: in a voice room the timing would give away who voted for whom. The result comes at the end.
  voted: number;
  winner: 'mafia' | 'town' | null;
  last: string;
  names: Record<string, string>;
  // Everyone's role, shown only when the game is over.
  roles: Record<string, Role> | null;
  // The narrator's clock when this was sent, so each phone can count down on its own clock.
  sentAt: number;
};

export type MafiaSecret =
  | { role: Role; checks: { target: string; mafia: boolean }[]; myVote: string | null; myNight: string | null; partners: string[] }
  // The narrator sees everything, as in the real game.
  | { role: 'narrator'; roles: Record<string, Role>; night: MafiaGame['night'] };

const alive = (g: MafiaGame) => g.players.filter((p) => !g.out.includes(p));
const name = (g: MafiaGame, id: string) => g.names[id] ?? 'Someone';

function winnerOf(g: MafiaGame): 'mafia' | 'town' | null {
  const living = alive(g);
  const mafia = living.filter((p) => g.roles[p] === 'mafia').length;
  if (mafia === 0) return 'town';
  if (mafia >= living.length - mafia) return 'mafia';
  return null;
}

function finish(g: MafiaGame, now: number): MafiaGame {
  const winner = winnerOf(g);
  if (!winner) return g;
  return { ...g, phase: 'over', winner, endsAt: now, last: winner === 'town' ? 'The town found the Mafia. Town wins' : 'The Mafia took over the town. Mafia wins' };
}

function startNight(g: MafiaGame, now: number, last: string): MafiaGame {
  return { ...g, phase: 'night', round: g.round + 1, endsAt: now + NIGHT_SECONDS * 1000, night: { mafia: null, doctor: null, detective: null }, votes: {}, last };
}

function endNight(g: MafiaGame, now: number): MafiaGame {
  const { mafia, doctor, detective } = g.night;
  const checks = detective ? [...g.checks, { target: detective, mafia: g.roles[detective] === 'mafia' }] : g.checks;
  const taken = mafia && mafia !== doctor ? mafia : null;
  const out = taken ? [...g.out, taken] : g.out;
  const last = taken ? `Last night, ${name(g, taken)} was taken out. They can still listen and chat.` : 'Nobody was taken out last night.';
  const day: MafiaGame = { ...g, out, checks, phase: 'day', endsAt: now + DAY_SECONDS * 1000, votes: {}, last };
  return finish(day, now);
}

function endDay(g: MafiaGame, now: number): MafiaGame {
  const counts: Record<string, number> = {};
  for (const target of Object.values(g.votes)) if (target !== 'skip') counts[target] = (counts[target] ?? 0) + 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const tie = ranked.length > 1 && ranked[0][1] === ranked[1][1];
  const chosen = ranked.length > 0 && !tie ? ranked[0][0] : null;
  const out = chosen ? [...g.out, chosen] : g.out;
  const last = chosen
    ? `The town voted ${name(g, chosen)} out, with ${counts[chosen]} ${counts[chosen] === 1 ? 'vote' : 'votes'}. They can still listen and chat.`
    : 'No decision today: nobody was voted out.';
  const after = finish({ ...g, out, last }, now);
  return after.phase === 'over' ? after : startNight(after, now, `${last} Night is falling.`);
}

export const mafia: TableGame<MafiaGame> = {
  id: 'mafia',
  name: 'Mafia',
  line: 'You narrate; 4 or more play. Find the Mafia',
  min: MIN_PLAYERS + 1,
  max: 10,
  setup(people, narrator, random, names = {}) {
    const players = shuffle(people.filter((p) => p !== narrator), random);
    const roles: Record<string, Role> = {};
    players.forEach((p, i) => {
      // One Mafia for up to 5 players, two for 6 or more; one Doctor and one Detective.
      const mafiaCount = players.length >= 6 ? 2 : 1;
      roles[p] = i < mafiaCount ? 'mafia' : i === mafiaCount ? 'doctor' : i === mafiaCount + 1 ? 'detective' : 'town';
    });
    const g: MafiaGame = {
      narrator,
      players: shuffle(players, random),
      roles,
      out: [],
      phase: 'night',
      round: 0,
      endsAt: 0,
      night: { mafia: null, doctor: null, detective: null },
      checks: [],
      votes: {},
      winner: null,
      last: '',
      names,
    };
    return startNight(g, Date.now(), 'Night falls. Everyone, close your eyes.');
  },
  apply(g, raw, by, now) {
    if (g.phase === 'over' || !g.players.includes(by) || g.out.includes(by)) return null;
    const m = raw as Partial<MafiaMove> & Record<string, unknown>;
    if (typeof m?.target !== 'string') return null;
    if (m.type === 'night' && g.phase === 'night') {
      const role = g.roles[by];
      if (role === 'town' || !g.players.includes(m.target) || g.out.includes(m.target)) return null;
      if (role === 'mafia' && g.roles[m.target] === 'mafia') return null;
      const night = { ...g.night, [role]: m.target };
      const next = { ...g, night };
      // Everyone with a night job has chosen: morning comes straight away.
      const jobs = alive(g).filter((p) => g.roles[p] !== 'town').map((p) => g.roles[p]);
      const done = jobs.every((r) => night[r as 'mafia' | 'doctor' | 'detective'] !== null);
      return done ? endNight(next, now) : next;
    }
    if (m.type === 'vote' && g.phase === 'day') {
      if (m.target !== 'skip' && (!g.players.includes(m.target) || g.out.includes(m.target) || m.target === by)) return null;
      const votes = { ...g.votes, [by]: m.target };
      const next = { ...g, votes };
      return Object.keys(votes).length >= alive(g).length ? endDay(next, now) : next;
    }
    return null;
  },
  publicView(g): MafiaPublic {
    return {
      narrator: g.narrator,
      players: g.players,
      out: g.out,
      phase: g.phase,
      round: g.round,
      endsAt: g.endsAt,
      voted: Object.keys(g.votes).length,
      winner: g.winner,
      last: g.last,
      names: g.names,
      roles: g.phase === 'over' ? g.roles : null,
      sentAt: Date.now(),
    };
  },
  secretFor(g, person): MafiaSecret | null {
    if (person === g.narrator) return { role: 'narrator', roles: g.roles, night: g.night };
    const role = g.roles[person];
    if (!role) return null;
    const myNight = role === 'town' ? null : g.night[role];
    // The Mafia know each other, as in the real game.
    const partners = role === 'mafia' ? g.players.filter((p) => p !== person && g.roles[p] === 'mafia') : [];
    return { role, checks: role === 'detective' ? g.checks : [], myVote: g.votes[person] ?? null, myNight: g.phase === 'night' ? myNight : null, partners };
  },
  tick(g, now) {
    if (g.phase === 'over' || now < g.endsAt) return null;
    return g.phase === 'night' ? endNight(g, now) : endDay(g, now);
  },
  leave(g, person) {
    if (person === g.narrator) {
      return { ...g, phase: 'over', winner: null, endsAt: Date.now(), last: 'The narrator left, so the game is over.' };
    }
    if (!g.players.includes(person) || g.out.includes(person)) return g;
    return finish({ ...g, out: [...g.out, person], last: `${name(g, person)} left the room.` }, Date.now());
  },
};
