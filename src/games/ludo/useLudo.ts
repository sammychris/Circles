import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { apply, newGame, type LudoAction, type LudoState } from './engine';

type Message =
  | { kind: 'start'; state: LudoState }
  | { kind: 'action'; action: LudoAction }
  | { kind: 'hello' }
  | { kind: 'state'; state: LudoState }
  | { kind: 'end'; by: string };

// One Ludo game per play room, shared through a Supabase Realtime channel. Every phone runs the same
// reducer on the same messages in the same order, so they all agree. Nothing is saved: when the room
// ends, the game is gone (CLAUDE.md: never keep scores after a room ends).
export function useLudo(roomId: string | null, me: string, enabled: boolean) {
  const [game, setGame] = useState<LudoState | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameRef = useRef<LudoState | null>(null);
  gameRef.current = game;

  useEffect(() => {
    if (!enabled || !roomId) return;
    const channel = supabase.channel(`ludo:${roomId}`, { config: { broadcast: { self: true } } });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'ludo' }, ({ payload }) => {
      const msg = payload as Message;
      if (msg.kind === 'start') setGame(msg.state);
      else if (msg.kind === 'action') setGame((g) => (g ? apply(g, msg.action) : g));
      else if (msg.kind === 'end') setGame(null);
      else if (msg.kind === 'hello' && gameRef.current) {
        // Someone just arrived: tell them where the game is.
        void channel.send({ type: 'broadcast', event: 'ludo', payload: { kind: 'state', state: gameRef.current } });
      } else if (msg.kind === 'state') {
        setGame((g) => (!g || msg.state.seq > g.seq ? msg.state : g));
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.send({ type: 'broadcast', event: 'ludo', payload: { kind: 'hello' } });
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setGame(null);
    };
  }, [enabled, roomId]);

  const send = useCallback((msg: Message) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'ludo', payload: msg });
  }, []);

  const start = useCallback(
    (players: string[]) => {
      send({ kind: 'start', state: newGame(players, me) });
    },
    [send, me],
  );

  const roll = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    send({ kind: 'action', action: { type: 'roll', by: me, value: 1 + Math.floor(Math.random() * 6), seq: g.seq } });
  }, [send, me]);

  const move = useCallback(
    (token: number) => {
      const g = gameRef.current;
      if (!g) return;
      send({ kind: 'action', action: { type: 'move', by: me, token, seq: g.seq } });
    },
    [send, me],
  );

  const leaveGame = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    send({ kind: 'action', action: { type: 'leave', by: me, seq: g.seq } });
  }, [send, me]);

  const endGame = useCallback(() => send({ kind: 'end', by: me }), [send, me]);

  return { game, start, roll, move, leaveGame, endGame };
}
