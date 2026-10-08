import { useCallback, useEffect, useRef, useState } from 'react';
import { utf8Decode, utf8Encode } from '../rooms/chat';
import type { DataListener } from '../voice/useVoiceRoom';
import {
  TABLE_TOPIC,
  acceptItem,
  cleanState,
  keepsTable,
  type Door,
  type TableItem,
  type TableMessage,
  type TableState,
} from './model';

// Both must be stable functions (useCallback in useVoiceRoom), or the table would reconnect every render.
type Publish = (topic: string, payload: Uint8Array<ArrayBuffer>, to?: string[]) => Promise<boolean>;
type Subscribe = (topic: string, listener: DataListener) => () => void;

export type NewTableItem = TableItem extends infer T ? (T extends TableItem ? Omit<T, 'id' | 'by' | 'byName' | 'at'> : never) : never;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
) {
  const [item, setItem] = useState<TableItem | null>(null);
  const [state, setState] = useState<TableState>({ seq: 0 });
  // Set when someone else's item won at the same moment as yours.
  const [bumped, setBumped] = useState(false);
  const itemRef = useRef<TableItem | null>(null);
  const stateRef = useRef<TableState>({ seq: 0 });
  itemRef.current = item;
  stateRef.current = state;
  const hostsRef = useRef(new Set<string>());
  hostsRef.current = new Set(people.filter((p) => p.isHost).map((p) => p.id));

  const send = useCallback(
    (msg: TableMessage, to?: string[]) => publishData(TABLE_TOPIC, utf8Encode(JSON.stringify(msg)), to),
    [publishData],
  );

  useEffect(() => {
    if (!connected || !door) return;
    const stop = onData(TABLE_TOPIC, (payload, from) => {
      let msg: TableMessage;
      try {
        msg = JSON.parse(utf8Decode(payload)) as TableMessage;
      } catch {
        return;
      }
      const current = itemRef.current;
      if (msg.k === 'hello') {
        if (current && current.by === me.id) void send({ k: 'put', item: current, state: stateRef.current }, [from.id]);
      } else if (msg.k === 'put') {
        const incoming = acceptItem(msg.item, from, door, photoUrlStart);
        if (!incoming || !keepsTable(current, incoming)) return;
        if (current && current.by === me.id && current.id !== incoming.id) setBumped(true);
        const photoCount = incoming.kind === 'photos' ? incoming.photos.length : 0;
        setItem(incoming);
        setState(cleanState(msg.state, incoming.kind, photoCount) ?? { seq: 0 });
      } else if (msg.k === 'state') {
        if (!current || current.id !== msg.id || current.by !== from.id) return;
        const next = cleanState(msg.state, current.kind, current.kind === 'photos' ? current.photos.length : 0);
        if (next && next.seq > stateRef.current.seq) setState(next);
      } else if (msg.k === 'off') {
        // Only the presenter, or a trained host, can take something off the table.
        if (current && current.id === msg.id && (current.by === from.id || hostsRef.current.has(from.id))) {
          setItem(null);
          setState({ seq: 0 });
        }
      }
    });
    // Ask whoever has something on the table to tell us.
    void send({ k: 'hello' });
    return () => {
      stop();
      setItem(null);
      setState({ seq: 0 });
    };
  }, [connected, door, onData, me.id, send, photoUrlStart]);

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

  const put = useCallback(
    async (fresh: NewTableItem, firstState: Omit<TableState, 'seq'> = {}) => {
      const next = { ...fresh, id: newId(), by: me.id, byName: me.nickname, at: Date.now() } as TableItem;
      const nextState = { ...firstState, seq: 1 };
      setBumped(false);
      setItem(next);
      setState(nextState);
      return send({ k: 'put', item: next, state: nextState });
    },
    [me.id, me.nickname, send],
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
    [me.id, send],
  );

  const takeOff = useCallback(() => {
    const current = itemRef.current;
    if (!current) return;
    setItem(null);
    setState({ seq: 0 });
    void send({ k: 'off', id: current.id });
  }, [send]);

  const mine = !!item && item.by === me.id;
  const iAmHost = people.some((p) => p.id === me.id && p.isHost);
  const clearBumped = useCallback(() => setBumped(false), []);
  return { item, state, mine, canTakeOff: mine || iAmHost, bumped, clearBumped, put, present, takeOff };
}
