import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import * as api from './api';
import { MAX_PLAYERS, MIN_PLAYERS, ROUNDS_PER_GAME, phaseAt, type ImpostorRound, type Result } from './logic';

// Rounds travel with how long ago they started (not a clock time), so phones with different clocks agree.
type Message =
  | { kind: 'round'; round: Omit<ImpostorRound, 'startedAt'>; elapsedMs: number }
  | { kind: 'hello' }
  | { kind: 'end'; gameId: string };

const SETTLE_MS = 2500;
const RESULT_POLL_MS = 3000;

// Same rule on every phone: a later round of the same game wins; between two games, the smaller id.
function prefer(current: ImpostorRound | null, incoming: ImpostorRound): ImpostorRound {
  if (!current) return incoming;
  if (incoming.gameId === current.gameId) return incoming.number >= current.number ? incoming : current;
  return incoming.gameId < current.gameId ? incoming : current;
}

export function useImpostor(roomId: string | null, me: string, enabled: boolean) {
  const [round, setRound] = useState<ImpostorRound | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Result | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roundRef = useRef<ImpostorRound | null>(null);
  roundRef.current = round;

  const broadcastRound = useCallback((r: ImpostorRound) => {
    const { startedAt, ...rest } = r;
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'impostor',
      payload: { kind: 'round', round: rest, elapsedMs: Date.now() - startedAt } satisfies Message,
    });
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) return;
    const channel = supabase.channel(`impostor:${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    const send = (msg: Message) => void channel.send({ type: 'broadcast', event: 'impostor', payload: msg });

    channel.on('broadcast', { event: 'impostor' }, ({ payload }) => {
      const msg = payload as Message;
      if (msg.kind === 'round') {
        setRound((r) => prefer(r, { ...msg.round, startedAt: Date.now() - msg.elapsedMs }));
      } else if (msg.kind === 'end') {
        setRound((r) => (r && r.gameId === msg.gameId ? null : r));
      } else if (msg.kind === 'hello' && roundRef.current) {
        broadcastRound(roundRef.current);
      }
    });

    let settle: ReturnType<typeof setTimeout> | undefined;
    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      send({ kind: 'hello' });
      settle = setTimeout(() => setReady(true), SETTLE_MS);
    });

    return () => {
      if (settle) clearTimeout(settle);
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setRound(null);
      setReady(false);
    };
  }, [enabled, roomId, broadcastRound]);

  // A new round: fetch my own card, forget the last result.
  const roundId = round?.roundId ?? null;
  const playing = !!round && round.order.includes(me);
  useEffect(() => {
    setCard(null);
    setOutcome(null);
    setMyVote(null);
    if (!roundId || !playing) return;
    let cancelled = false;
    void api
      .myCard(roundId)
      .then((c) => !cancelled && setCard(c))
      .catch(() => !cancelled && setCard(null));
    return () => {
      cancelled = true;
    };
  }, [roundId, playing]);

  // Ticks once a second while a round is on.
  useEffect(() => {
    if (!round) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [round]);

  // While voting, ask the server for the result until it's ready.
  const voting = !!round && phaseAt(round, now).kind === 'voting';
  useEffect(() => {
    if (!voting || !roundId || !playing || outcome) return;
    let cancelled = false;
    const check = async () => {
      try {
        const r = await api.result(roundId);
        if (cancelled) return;
        if (r.ready) setOutcome(r);
        else setMyVote(r.myVote);
      } catch {
        // try again on the next tick
      }
    };
    void check();
    const timer = setInterval(() => void check(), RESULT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [voting, roundId, playing, outcome]);

  const begin = useCallback(
    async (players: string[], number: number, gameId: string) => {
      if (!roomId) return;
      const chosen = players.slice(0, MAX_PLAYERS);
      if (chosen.length < MIN_PLAYERS || !chosen.includes(me)) return;
      setBusy(true);
      try {
        const { roundId: id, order } = await api.startRound(roomId, chosen);
        const r: ImpostorRound = { roundId: id, number, order, startedAt: Date.now(), gameId, startedBy: me };
        setRound(r);
        broadcastRound(r);
      } finally {
        setBusy(false);
      }
    },
    [roomId, me, broadcastRound],
  );

  const startGame = useCallback(
    (players: string[]) => {
      const r = roundRef.current;
      if (r && !(r.number >= ROUNDS_PER_GAME && outcome)) return; // never replace a game in play
      void begin(players, 1, `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`);
    },
    [begin, outcome],
  );

  const nextRound = useCallback(
    (players: string[]) => {
      const r = roundRef.current;
      if (!r || r.number >= ROUNDS_PER_GAME) return;
      void begin(players, r.number + 1, r.gameId);
    },
    [begin],
  );

  const castVote = useCallback(
    async (target: string) => {
      if (!roundId) return;
      setMyVote(target);
      try {
        await api.vote(roundId, target);
      } catch {
        setMyVote(null);
      }
    },
    [roundId],
  );

  const endGame = useCallback(() => {
    const r = roundRef.current;
    if (!r) return;
    void channelRef.current?.send({ type: 'broadcast', event: 'impostor', payload: { kind: 'end', gameId: r.gameId } });
    setRound(null);
  }, []);

  return { round, card, outcome, myVote, ready, busy, now, playing, startGame, nextRound, castVote, endGame };
}
