import { useCallback, useEffect, useRef, useState } from 'react';
import { utf8Decode, utf8Encode } from '../rooms/chat';
import type { DataListener } from '../voice/useVoiceRoom';
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
const MESSAGES_PER_10S = 20;
// Someone arriving asks what's on the table, and asks again in case the presenter didn't know them yet.
const HELLO_RETRY_MS = [3000, 8000];
// The presenter answers each person's "what's on the table?" at most this often.
const ANSWER_EVERY_MS = 4000;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  people: { id: string; isHost: boolean }[],
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
      if (times.length >= MESSAGES_PER_10S) return;
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
        }
      } else if (msg.k === 'put') {
        const incoming = acceptItem(msg.item, from, door, photoUrlStart, now);
        if (!incoming || !keepsTable(current, incoming)) return;
        if (current && current.by === me.id && current.id !== incoming.id) setBumped(true);
        const photoCount = incoming.kind === 'photos' ? incoming.photos.length : 0;
        setItem(incoming);
        setState(cleanState(msg.state, incoming.kind, photoCount) ?? { seq: 0 });
      } else if (msg.k === 'state') {
        if (!current || current.id !== msg.id || current.by !== from.id) return;
        const next = cleanState(msg.state, current.kind, current.kind === 'photos' ? current.photos.length : 0);
        if (next && next.seq > stateRef.current.seq) setState(next);
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
        const next = { ...st, index, startedAt: Date.now(), seq: st.seq + 1 };
        setState(next);
        void send({ k: 'state', id: current.id, state: next });
      } else if (msg.k === 'off') {
        // Only the presenter, or a trained host, can take something off the table.
        if (current && current.id === msg.id && (current.by === from.id || hostsRef.current.has(from.id))) {
          setItem(null);
          setState({ seq: 0 });
        }
      }
    });
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
      setItem(null);
      setState({ seq: 0 });
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

  // A new item: forget the last quiz answer.
  const itemId = item?.id;
  useEffect(() => setMyAnswer(null), [itemId]);

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
    const counts = tally(quizAnswers.current, current.answers.length);
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
    const next = { ...st, index: nextTurn(st.order, st.index ?? 0, peopleRef.current), startedAt: Date.now(), seq: st.seq + 1 };
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
      const joined = here.filter((id) => !order.includes(id));
      const nextOrder = joined.length > 0 ? [...order, ...joined] : order;
      const current = nextOrder[st.index ?? 0];
      const timeUp = Date.now() - (st.startedAt ?? 0) > item.minutes * 60_000;
      const left = current !== undefined && !here.includes(current);
      if (!timeUp && !left && joined.length === 0) return;
      const index = timeUp || left ? nextTurn(nextOrder, st.index ?? 0, here) : st.index ?? 0;
      const next = { ...st, order: nextOrder, index, startedAt: timeUp || left ? Date.now() : st.startedAt, seq: st.seq + 1 };
      setState(next);
      void send({ k: 'state', id: item.id, state: next });
    }, 1000);
    return () => clearInterval(timer);
  }, [item, me.id, send, setState]);

  const mine = !!item && item.by === me.id;
  const clearBumped = useCallback(() => setBumped(false), []);
  return {
    item,
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
  };
}
