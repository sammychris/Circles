import { useCallback, useEffect, useRef, useState } from 'react';
import { utf8Decode, utf8Encode } from '../rooms/chat';
import type { DataListener } from '../voice/useVoiceRoom';
import { GAMES } from '../games/registry';
import type { GameId } from '../games/tableGame';
import {
  TABLE_TOPIC,
  acceptItem,
  cleanState,
  itemToWire,
  keepsTable,
  nextTurn,
  tally,
  type Door,
  type TableItem,
  type TableMessage,
  type TableState,
} from './model';

// Both must be stable functions (useCallback in useVoiceRoom), or the table would reconnect every render.
type Publish = (topic: string, payload: Uint8Array<ArrayBuffer>, to?: string[]) => Promise<boolean>;
type Subscribe = (topic: string, listener: DataListener) => () => void;

export type NewTableItem = TableItem extends infer T ? (T extends TableItem ? Omit<T, 'id' | 'by' | 'byName' | 'at'> : never) : never;

// A phone sending more table messages than this is ignored for a while (a changed app flooding the room).
// The person whose item is on the table sends one update per move to everyone, so they get more room.
const MESSAGES_PER_10S = 20;
const PRESENTER_MESSAGES_PER_10S = 120;
// A player who drops out of the room keeps their place in a game this long, in case they come back
// (activities.md rule 7: a game survives a 30-second reconnect).
const LEAVE_GRACE_MS = 30_000;
// Someone arriving asks what's on the table, and asks again in case the presenter didn't know them yet.
const HELLO_RETRY_MS = [3000, 8000];
// The presenter answers each person's "what's on the table?" at most this often.
const ANSWER_EVERY_MS = 4000;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// The presenter's times are turned into this phone's clock: "started 40 seconds before it was sent".
function onLocalClock(st: TableState, receivedAt: number): TableState {
  if (st.startedAt === undefined || st.sentAt === undefined) return st;
  return { ...st, startedAt: receivedAt - Math.max(0, st.sentAt - st.startedAt) };
}

function putMessage(current: TableItem, st: TableState): TableMessage {
  return { k: 'put', item: itemToWire(current), state: st };
}

// One thing on the table at a time. The person who put it there keeps it on their phone and tells
// everyone, including people who arrive later; when they leave the room, it leaves with them.
export function useTable(
  publishData: Publish,
  onData: Subscribe,
  me: { id: string; nickname: string },
  door: Door | null,
  connected: boolean,
  people: { id: string; isHost: boolean; nickname?: string }[],
  photoUrlStart: string,
  // Bumped after a full reconnect: ask again what's on the table.
  reconnects = 0,
) {
  const [item, setItemState] = useState<TableItem | null>(null);
  const [state, setStateState] = useState<TableState>({ seq: 0 });
  // Set when someone else's item took the table while you were putting yours on.
  const [bumped, setBumped] = useState(false);
  // Refs change together with state, so a message arriving in the same moment sees the latest.
  const itemRef = useRef<TableItem | null>(null);
  const stateRef = useRef<TableState>({ seq: 0 });
  const setItem = useCallback((next: TableItem | null) => {
    itemRef.current = next;
    setItemState(next);
  }, []);
  const setState = useCallback((next: TableState) => {
    stateRef.current = next;
    setStateState(next);
  }, []);
  const peopleRef = useRef<string[]>([]);
  peopleRef.current = people.map((p) => p.id);
  const namesRef = useRef(new Map<string, string>());
  namesRef.current = new Map(people.map((p) => [p.id, p.nickname ?? 'Someone']));
  const hostsRef = useRef(new Set<string>());
  hostsRef.current = new Set(people.filter((p) => p.isHost).map((p) => p.id));
  const iAmHost = people.some((p) => p.id === me.id && p.isHost);
  const iAmHostRef = useRef(iAmHost);
  iAmHostRef.current = iAmHost;
  const heard = useRef(new Map<string, number[]>());
  // The presenter's quiz answers, by person (never shown to anyone, only counted).
  const quizAnswers = useRef(new Map<string, number>());
  const [answeredCount, setAnsweredCount] = useState(0);
  // This person's own quiz answer.
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  // Games: the whole game, on the starter's phone only; and this person's own hand or role.
  const fullGame = useRef<unknown>(null);
  // Kept with the id of the game it belongs to, so it can arrive in the same moment as the game itself.
  const [secretFor, setMySecret] = useState<{ id: string; data: unknown } | null>(null);
  // Items this phone closed for itself (left the game, or done with a finished one).
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const answered = useRef(new Map<string, number>());

  const send = useCallback(
    (msg: TableMessage, to?: string[]) => publishData(TABLE_TOPIC, utf8Encode(JSON.stringify(msg)), to),
    [publishData],
  );

  useEffect(() => {
    if (!connected || !door) return;
    const stop = onData(TABLE_TOPIC, (payload, from) => {
      const now = Date.now();
      const times = (heard.current.get(from.id) ?? []).filter((t) => now - t < 10_000);
      if (times.length >= (itemRef.current?.by === from.id ? PRESENTER_MESSAGES_PER_10S : MESSAGES_PER_10S)) return;
      heard.current.set(from.id, [...times, now]);
      let msg: TableMessage;
      try {
        msg = JSON.parse(utf8Decode(payload)) as TableMessage;
      } catch {
        return;
      }
      const current = itemRef.current;
      if (msg.k === 'hello') {
        const last = answered.current.get(from.id) ?? 0;
        if (current && current.by === me.id && now - last > ANSWER_EVERY_MS) {
          answered.current.set(from.id, now);
          void send(putMessage(current, stateRef.current), [from.id]);
          // A player coming back gets their hand or role again.
          if (current.kind === 'game') {
            const engine = GAMES[current.game];
            const secret = engine?.secretFor && fullGame.current ? engine.secretFor(fullGame.current, from.id) : null;
            if (secret !== null && secret !== undefined) void send({ k: 'secret', id: current.id, data: secret }, [from.id]);
          }
        }
      } else if (msg.k === 'put') {
        const incoming = acceptItem(msg.item, from, door, photoUrlStart, now);
        if (!incoming || !keepsTable(current, incoming)) return;
        if (current && current.by === me.id && current.id !== incoming.id) setBumped(true);
        const photoCount = incoming.kind === 'photos' ? incoming.photos.length : 0;
        setItem(incoming);
        setState(onLocalClock(cleanState(msg.state, incoming.kind, photoCount) ?? { seq: 0 }, now));
      } else if (msg.k === 'state') {
        if (!current || current.id !== msg.id || current.by !== from.id) return;
        const next = cleanState(msg.state, current.kind, current.kind === 'photos' ? current.photos.length : 0);
        if (next && next.seq > stateRef.current.seq) setState(onLocalClock(next, now));
      } else if (msg.k === 'answer') {
        // Only the presenter counts answers, one per person, until the reveal.
        if (!current || current.by !== me.id || current.kind !== 'quiz' || current.id !== msg.id) return;
        if (stateRef.current.revealed || typeof msg.choice !== 'number') return;
        if (!Number.isInteger(msg.choice) || msg.choice < 0 || msg.choice >= current.answers.length) return;
        quizAnswers.current.set(from.id, msg.choice);
        setAnsweredCount(quizAnswers.current.size);
      } else if (msg.k === 'pass') {
        // The speaker hands on their turn.
        if (!current || current.by !== me.id || current.kind !== 'turns' || current.id !== msg.id) return;
        const st = stateRef.current;
        if (!st.order || st.order[st.index ?? 0] !== from.id) return;
        const index = nextTurn(st.order, st.index ?? 0, peopleRef.current);
        const next = { ...st, index, startedAt: Date.now(), sentAt: Date.now(), seq: st.seq + 1 };
        setState(next);
        void send({ k: 'state', id: current.id, state: next });
      } else if (msg.k === 'move') {
        // The starter checks every move with the game's rules.
        if (!current || current.by !== me.id || current.kind !== 'game' || current.id !== msg.id) return;
        playMove(current.game, msg.move, from.id);
      } else if (msg.k === 'secret') {
        // Only ever believed from the starter of the game on the table.
        if (current && current.kind === 'game' && current.id === msg.id && current.by === from.id) setMySecret({ id: msg.id, data: msg.data });
      } else if (msg.k === 'off') {
        // Only the presenter, or a trained host, can take something off the table.
        if (current && current.id === msg.id && (current.by === from.id || hostsRef.current.has(from.id))) {
          setItem(null);
          setState({ seq: 0 });
        }
      }
    });
    // After a reconnect the presenter tells everyone again what's on the table.
    if (itemRef.current && itemRef.current.by === me.id) void send(putMessage(itemRef.current, stateRef.current));
    // Ask whoever has something on the table to tell us, and once or twice more in case they didn't
    // know about us yet.
    void send({ k: 'hello' });
    const retries = HELLO_RETRY_MS.map((ms) =>
      setTimeout(() => {
        if (!itemRef.current) void send({ k: 'hello' });
      }, ms),
    );
    return () => {
      stop();
      retries.forEach(clearTimeout);
      // Your own item survives a reconnect; anyone else's is asked for again.
      if (itemRef.current?.by !== me.id) {
        setItem(null);
        setState({ seq: 0 });
      }
    };
  }, [connected, door, onData, me.id, send, photoUrlStart, reconnects, setItem, setState]);

  // The presenter left the room: their item goes with them.
  const peopleKey = people.map((p) => p.id).join(',');
  useEffect(() => {
    const current = itemRef.current;
    if (current && people.length > 0 && !people.some((p) => p.id === current.by)) {
      setItem(null);
      setState({ seq: 0 });
    }
    // peopleKey stands in for people.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleKey]);

  // Puts something on the table. Someone else's item can only be replaced by a trained host, who
  // takes it off for everyone first. Returns false when the table was taken in the meantime.
  const put = useCallback(
    async (fresh: NewTableItem, firstState: Omit<TableState, 'seq'> = {}) => {
      const current = itemRef.current;
      if (current && current.by !== me.id) {
        if (!iAmHostRef.current) {
          setBumped(true);
          return false;
        }
        await send({ k: 'off', id: current.id });
      }
      const next = { ...fresh, id: newId(), by: me.id, byName: me.nickname, at: Date.now() } as TableItem;
      const nextState = { ...firstState, seq: 1 };
      quizAnswers.current = new Map();
      setAnsweredCount(0);
      setMyAnswer(null);
      setBumped(false);
      setItem(next);
      setState(nextState);
      return send(putMessage(next, nextState));
    },
    [me.id, me.nickname, send, setItem, setState],
  );

  // The presenter moves on (next photo, play, pause): everyone follows.
  const present = useCallback(
    (change: Omit<TableState, 'seq'>) => {
      const current = itemRef.current;
      if (!current || current.by !== me.id) return;
      const next = { ...stateRef.current, ...change, seq: stateRef.current.seq + 1 };
      setState(next);
      void send({ k: 'state', id: current.id, state: next });
    },
    [me.id, send, setState],
  );

  const takeOff = useCallback(() => {
    const current = itemRef.current;
    if (!current) return;
    setItem(null);
    setState({ seq: 0 });
    void send({ k: 'off', id: current.id });
  }, [send, setItem, setState]);

  // Just for this phone: you blocked the presenter, so their item goes away for you.
  const dismissFrom = useCallback(
    (personId: string) => {
      if (itemRef.current?.by !== personId) return;
      setItem(null);
      setState({ seq: 0 });
    },
    [setItem, setState],
  );

  // --- games ---
  // The starter's phone: a new game state goes to everyone, and each player's own part only to them.
  const commitGame = useCallback(
    (gameId: GameId, full: unknown) => {
      const current = itemRef.current;
      const engine = GAMES[gameId];
      if (!current || current.kind !== 'game' || !engine) return;
      fullGame.current = full;
      const next = { ...stateRef.current, g: engine.publicView(full), seq: stateRef.current.seq + 1 };
      setState(next);
      void send({ k: 'state', id: current.id, state: next });
      if (engine.secretFor) {
        setMySecret({ id: current.id, data: engine.secretFor(full, me.id) });
        for (const person of peopleRef.current) {
          if (person === me.id) continue;
          const secret = engine.secretFor(full, person);
          if (secret !== null && secret !== undefined) void send({ k: 'secret', id: current.id, data: secret }, [person]);
        }
      }
    },
    [me.id, send, setState],
  );
  const commitRef = useRef(commitGame);
  commitRef.current = commitGame;

  // Checked with the game's own rules on the starter's phone.
  function playMove(gameId: GameId, move: unknown, by: string) {
    const engine = GAMES[gameId];
    if (!engine || fullGame.current === null) return;
    // Anyone can leave a game without leaving the room (activities.md rule 4).
    if ((move as { type?: unknown } | null)?.type === 'leave') {
      if (engine.leave && by !== me.id) commitRef.current(gameId, engine.leave(fullGame.current, by));
      return;
    }
    const next = engine.apply(fullGame.current, move, by, Date.now());
    if (next) commitRef.current(gameId, next);
  }

  // Starts a game with everyone in the room.
  const startGame = useCallback(
    async (gameId: GameId) => {
      const engine = GAMES[gameId];
      if (!engine) return false;
      const names = Object.fromEntries(namesRef.current);
      const full = engine.setup(peopleRef.current.slice(0, engine.max), me.id, Math.random, names);
      const ok = await put({ kind: 'game', game: gameId }, { g: engine.publicView(full) });
      if (ok === false) return false;
      fullGame.current = full;
      commitRef.current(gameId, full);
      return true;
    },
    [me.id, put],
  );

  // A move: played straight away on the starter's phone, otherwise sent to it.
  const sendMove = useCallback(
    (move: unknown) => {
      const current = itemRef.current;
      if (!current || current.kind !== 'game') return;
      if (current.by === me.id) playMove(current.game, move, me.id);
      else void send({ k: 'move', id: current.id, move }, [current.by]);
    },
    // playMove only uses refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me.id, send],
  );

  // Leaves the game on the table, staying in the room. The card closes on this phone.
  const leaveGame = useCallback(() => {
    const current = itemRef.current;
    if (!current || current.kind !== 'game' || current.by === me.id) return;
    void send({ k: 'move', id: current.id, move: { type: 'leave' } }, [current.by]);
    setHiddenId(current.id);
  }, [me.id, send]);
  // Closes the card on this phone only (a finished game someone else started).
  const hideItem = useCallback(() => {
    if (itemRef.current) setHiddenId(itemRef.current.id);
  }, []);

  // The starter's phone, every second: timers (a chess vote, a Mafia night), and players who left the
  // room more than 30 seconds ago leave the game.
  const gameItem = item && item.kind === 'game' && item.by === me.id ? item : null;
  const gameItemId = gameItem?.id;
  const gameId = gameItem?.kind === 'game' ? gameItem.game : null;
  useEffect(() => {
    if (!gameItemId || !gameId) return;
    const engine = GAMES[gameId];
    if (!engine) return;
    const goneSince = new Map<string, number>();
    let seen = new Set(peopleRef.current);
    const timer = setInterval(() => {
      if (fullGame.current === null) return;
      const now = Date.now();
      const here = peopleRef.current;
      for (const id of here) {
        seen.add(id);
        goneSince.delete(id);
      }
      for (const id of seen) if (!here.includes(id) && !goneSince.has(id)) goneSince.set(id, now);
      let full: unknown = fullGame.current;
      let changed = false;
      for (const [id, since] of goneSince) {
        if (now - since < LEAVE_GRACE_MS) continue;
        goneSince.delete(id);
        seen = new Set([...seen].filter((p) => p !== id));
        if (engine.leave) {
          full = engine.leave(full, id);
          changed = true;
        }
      }
      const ticked = engine.tick?.(full, now, here);
      if (ticked) {
        full = ticked;
        changed = true;
      }
      if (changed) commitRef.current(gameId, full);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameItemId, gameId]);

  // A new item: forget the last quiz answer. (A hand or role is kept with its own game's id.)
  const itemId = item?.id;
  useEffect(() => {
    setMyAnswer(null);
  }, [itemId]);

  // Quiz: send your answer to the presenter only. You can change it until the reveal.
  const answer = useCallback(
    (choice: number) => {
      const current = itemRef.current;
      if (!current || current.kind !== 'quiz' || stateRef.current.revealed) return;
      setMyAnswer(choice);
      if (current.by === me.id) {
        quizAnswers.current.set(me.id, choice);
        setAnsweredCount(quizAnswers.current.size);
      } else void send({ k: 'answer', id: current.id, choice }, [current.by]);
    },
    [me.id, send],
  );

  // Quiz: the presenter shows how many chose each answer. Never who.
  const reveal = useCallback(() => {
    const current = itemRef.current;
    if (!current || current.by !== me.id || current.kind !== 'quiz') return;
    // Only people still in the room count.
    const here = new Map([...quizAnswers.current].filter(([id]) => peopleRef.current.includes(id)));
    const counts = tally(here, current.answers.length);
    const next = { ...stateRef.current, revealed: true, counts, seq: stateRef.current.seq + 1 };
    setState(next);
    void send({ k: 'state', id: current.id, state: next });
  }, [me.id, send, setState]);

  // Take turns: the speaker (or the presenter) moves on to the next person.
  const passTurn = useCallback(() => {
    const current = itemRef.current;
    if (!current || current.kind !== 'turns') return;
    if (current.by !== me.id) {
      void send({ k: 'pass', id: current.id }, [current.by]);
      return;
    }
    const st = stateRef.current;
    if (!st.order || st.order.length === 0) return;
    const next = { ...st, index: nextTurn(st.order, st.index ?? 0, peopleRef.current), startedAt: Date.now(), sentAt: Date.now(), seq: st.seq + 1 };
    setState(next);
    void send({ k: 'state', id: current.id, state: next });
  }, [me.id, send, setState]);

  // Take turns, on the presenter's phone: people who arrive join the end of the order, and when time
  // is up the turn moves on by itself.
  useEffect(() => {
    if (!item || item.kind !== 'turns' || item.by !== me.id) return;
    const timer = setInterval(() => {
      const st = stateRef.current;
      const order = st.order ?? [];
      const here = peopleRef.current;
      const speaker = order[st.index ?? 0];
      const timeUp = Date.now() - (st.startedAt ?? 0) > item.minutes * 60_000;
      const speakerLeft = speaker !== undefined && !here.includes(speaker);
      const changed = order.some((id) => !here.includes(id)) || here.some((id) => !order.includes(id));
      if (!timeUp && !speakerLeft && !changed) return;
      // Whose turn is next, worked out on the old order, then people who left are dropped and people who
      // arrived join the end (at most 12, the same on every phone).
      const nextSpeaker = timeUp || speakerLeft ? order[nextTurn(order, st.index ?? 0, here)] : speaker;
      const nextOrder = [...order.filter((id) => here.includes(id)), ...here.filter((id) => !order.includes(id))].slice(0, 12);
      const index = Math.max(0, nextOrder.indexOf(nextSpeaker ?? ''));
      const restart = timeUp || speakerLeft;
      const next = { ...st, order: nextOrder, index, startedAt: restart ? Date.now() : st.startedAt, sentAt: Date.now(), seq: st.seq + 1 };
      setState(next);
      void send({ k: 'state', id: item.id, state: next });
    }, 1000);
    return () => clearInterval(timer);
  }, [item, me.id, send, setState]);

  const shown = item && item.id !== hiddenId ? item : null;
  const mine = !!shown && shown.by === me.id;
  const clearBumped = useCallback(() => setBumped(false), []);
  return {
    item: shown,
    state,
    mine,
    canTakeOff: mine || iAmHost,
    bumped,
    clearBumped,
    put,
    present,
    takeOff,
    dismissFrom,
    myAnswer,
    answeredCount,
    answer,
    reveal,
    passTurn,
    mySecret: secretFor && item && secretFor.id === item.id ? secretFor.data : null,
    startGame,
    sendMove,
    leaveGame,
    hideItem,
  };
}
