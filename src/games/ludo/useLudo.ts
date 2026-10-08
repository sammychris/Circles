import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { newGame, type LudoAction, type LudoState } from './engine';
import { absentPlayers, preferGame, receiveAction } from './sync';

type Message =
  | { kind: 'start'; state: LudoState }
  | { kind: 'action'; gameId: string; action: LudoAction }
  | { kind: 'hello' }
  | { kind: 'state'; state: LudoState }
  | { kind: 'end'; gameId: string };

// How long a newly arrived phone listens for a running game before offering "Play Ludo".
const SETTLE_MS = 2500;

// One Ludo game per play room, shared through a Supabase Realtime channel. Every phone runs the same
// reducer on the same messages, and the rules in sync.ts make phones agree on one game. Nothing is
// saved: when the room ends, the game is gone (CLAUDE.md: never keep scores after a room ends).
export function useLudo(roomId: string | null, me: string, enabled: boolean, inRoom: string[]) {
  const [game, setGame] = useState<LudoState | null>(null);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameRef = useRef<LudoState | null>(null);
  gameRef.current = game;

  const send = useCallback((msg: Message) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'ludo', payload: msg });
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) return;
    const channel = supabase.channel(`ludo:${roomId}`, { config: { broadcast: { self: true } } });
    channelRef.current = channel;
    const hello = () => void channel.send({ type: 'broadcast', event: 'ludo', payload: { kind: 'hello' } });

    channel.on('broadcast', { event: 'ludo' }, ({ payload }) => {
      const msg = payload as Message;
      if (msg.kind === 'start' || msg.kind === 'state') {
        setGame((g) => preferGame(g, msg.state));
      } else if (msg.kind === 'action') {
        const result = receiveAction(gameRef.current, msg.gameId, msg.action);
        if (result.resync) hello();
        setGame(result.state);
      } else if (msg.kind === 'end') {
        setGame((g) => (g && g.id === msg.gameId ? null : g));
      } else if (msg.kind === 'hello' && gameRef.current) {
        // Someone just arrived, or missed a move: tell them where the game is.
        void channel.send({ type: 'broadcast', event: 'ludo', payload: { kind: 'state', state: gameRef.current } });
      }
    });

    let settle: ReturnType<typeof setTimeout> | undefined;
    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      hello();
      settle = setTimeout(() => setReady(true), SETTLE_MS);
    });

    return () => {
      if (settle) clearTimeout(settle);
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setGame(null);
      setReady(false);
    };
  }, [enabled, roomId]);

  // People who left the room leave the game too, so their team never gets stuck. One phone does it
  // (the person in the room with the smallest id), so the leave is only sent once.
  const inRoomKey = inRoom.slice().sort().join(',');
  useEffect(() => {
    const g = gameRef.current;
    if (!g || g.winner || inRoom.length === 0) return;
    const sorted = inRoom.slice().sort();
    if (sorted[0] !== me) return;
    for (const gone of absentPlayers(g, inRoom)) {
      send({ kind: 'action', gameId: g.id, action: { type: 'leave', by: gone, seq: g.seq } });
    }
    // inRoomKey stands in for inRoom, so this runs only when the people in the room change.
  }, [inRoomKey, game?.id, me, send]);

  const start = useCallback(
    (players: string[]) => {
      const g = gameRef.current;
      // Never replace a game that's still being played.
      if (g && !g.winner) return;
      send({ kind: 'start', state: newGame(players, me) });
    },
    [send, me],
  );

  const roll = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    send({ kind: 'action', gameId: g.id, action: { type: 'roll', by: me, value: 1 + Math.floor(Math.random() * 6), seq: g.seq } });
  }, [send, me]);

  const move = useCallback(
    (token: number) => {
      const g = gameRef.current;
      if (!g) return;
      send({ kind: 'action', gameId: g.id, action: { type: 'move', by: me, token, seq: g.seq } });
    },
    [send, me],
  );

  const leaveGame = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    send({ kind: 'action', gameId: g.id, action: { type: 'leave', by: me, seq: g.seq } });
  }, [send, me]);

  const endGame = useCallback(() => {
    const g = gameRef.current;
    if (g) send({ kind: 'end', gameId: g.id });
  }, [send]);

  return { game, ready, start, roll, move, leaveGame, endGame };
}
