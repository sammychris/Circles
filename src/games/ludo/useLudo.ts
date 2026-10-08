import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { gameMode } from '../../theme/tokens';
import { apply, newGame, type LudoAction, type LudoState } from './engine';
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
  // Your own move, shown straight away (game-mode.md › Instant moves). Every phone applies the same
  // moves in the order the room's channel delivers them, so this is only a guess on top: the next real
  // update replaces it, and if none comes in 3 seconds the token slides back.
  const [guess, setGuess] = useState<LudoState | null>(null);
  const guessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failedAt, setFailedAt] = useState(0);
  // Rolling: from the tap until the room's answer arrives. Dice are never guessed, so nobody can cheat.
  const [rollingSince, setRollingSince] = useState<number | null>(null);
  useEffect(
    () => () => {
      if (guessTimer.current) clearTimeout(guessTimer.current);
    },
    [],
  );
  const waitForAnswer = useCallback(() => {
    if (guessTimer.current) clearTimeout(guessTimer.current);
    guessTimer.current = setTimeout(() => {
      setGuess(null);
      setRollingSince(null);
      setFailedAt(Date.now());
    }, gameMode.moveTimeoutMs);
  }, []);

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
        const before = gameRef.current;
        const result = receiveAction(before, msg.gameId, msg.action);
        if (result.resync) hello();
        setGame(result.state);
        // Your own move or roll coming back from the room: it was played, or someone on your team got
        // there first (then it slides back and says so).
        if (msg.action.by === me && msg.action.type !== 'leave') {
          if (guessTimer.current) clearTimeout(guessTimer.current);
          setGuess(null);
          if (!result.resync && result.state === before) {
            setRollingSince(null);
            setFailedAt(Date.now());
          }
        }
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
    setRollingSince(Date.now());
    waitForAnswer();
    send({ kind: 'action', gameId: g.id, action: { type: 'roll', by: me, value: 1 + Math.floor(Math.random() * 6), seq: g.seq } });
  }, [send, me, waitForAnswer]);

  const move = useCallback(
    (token: number) => {
      const g = gameRef.current;
      if (!g) return;
      const action: LudoAction = { type: 'move', by: me, token, seq: g.seq };
      const next = apply(g, action);
      if (next !== g) setGuess(next);
      waitForAnswer();
      send({ kind: 'action', gameId: g.id, action });
    },
    [send, me, waitForAnswer],
  );
  // The roll's answer arrived (or the game moved on): the dice can settle.
  const rolled = useCallback(() => setRollingSince(null), []);

  const leaveGame = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    send({ kind: 'action', gameId: g.id, action: { type: 'leave', by: me, seq: g.seq } });
  }, [send, me]);

  const endGame = useCallback(() => {
    const g = gameRef.current;
    if (g) send({ kind: 'end', gameId: g.id });
  }, [send]);

  const shown = guess && game && guess.id === game.id && guess.seq > game.seq ? guess : game;
  return { game: shown, ready, start, roll, move, leaveGame, endGame, pending: !!guess, rollingSince, rolled, failedAt };
}
