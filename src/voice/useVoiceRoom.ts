import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
} from 'livekit-client';
import { playRemoteAudio, startAudio, stopAudio, stopRemoteAudio } from './audio';
import { CHAT_KEEP, CHAT_TOPIC, cleanChat, decodeChat, encodeChat, tooFast, tooFastFrom, type ChatMessage } from '../rooms/chat';
import { BadTitleError, NoHostError, PausedError, RoomEndedError, RoomFullError, TooManyRoomsError, getTicket, setHandUp, type RoomInfo, type RoomRequest } from '../rooms/api';
import {
  micPermissionGranted,
  requestNotificationPermission,
  startRoomService,
  stopRoomService,
} from './foregroundService';

export type Person = {
  id: string;
  nickname: string;
  isMe: boolean;
  isHost: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  // Raised hand: a quiet "I'd like to say something". handAt orders hands, oldest first.
  handUp: boolean;
  handAt: number;
  joinedAt: number;
};

export type RoomStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'full'
  | 'noHost'
  | 'paused'
  | 'ended'
  | 'tooMany'
  | 'badTitle'
  | 'error'
  | 'dropped';

export type JoinNumbers = {
  joinMs: number | null;
  firstVoiceMs: number | null;
  quality: 'excellent' | 'good' | 'poor' | 'lost' | 'unknown';
};

// Everyone who was in the room while you were, for the after-room screen. Kept on this phone only.
export type SeenPerson = { id: string; nickname: string; isHost: boolean; spoke: boolean };

export type RoomSummary = { room: RoomInfo; minutes: number; seen: SeenPerson[] };

function hostFlag(p: Participant): boolean {
  try {
    return !!(p.metadata && JSON.parse(p.metadata).host);
  } catch {
    return false;
  }
}

// The hand is a participant attribute ("hand" = the time it went up, empty when down).
function handTime(p: Participant): number {
  const raw = p.attributes?.hand;
  const at = raw ? Number(raw) : 0;
  return Number.isFinite(at) && at > 0 ? at : 0;
}

function toPerson(p: Participant, isMe: boolean): Person {
  const handAt = handTime(p);
  return {
    id: p.identity,
    nickname: p.name || 'Someone',
    isMe,
    isHost: hostFlag(p),
    isSpeaking: p.isSpeaking,
    isMuted: !p.isMicrophoneEnabled,
    handUp: handAt > 0,
    handAt,
    joinedAt: p.joinedAt ? p.joinedAt.getTime() : 0,
  };
}

const NO_NUMBERS: JoinNumbers = { joinMs: null, firstVoiceMs: null, quality: 'unknown' };

export function useVoiceRoom() {
  const roomRef = useRef<Room | null>(null);
  const startedAt = useRef(0);
  const connectedAt = useRef(0);
  // Bumped on every leave, so a join that is still waiting knows it was cancelled.
  const attempt = useRef(0);
  const seen = useRef(new Map<string, SeenPerson>());
  // People this person blocked: silenced for them (volume 0) while they share a room.
  const silenced = useRef(new Set<string>());
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [numbers, setNumbers] = useState<JoinNumbers>(NO_NUMBERS);
  // Kept after a dropped connection, so the after-room screen (save, thank, report) still works.
  const [lastSummary, setLastSummary] = useState<RoomSummary | null>(null);
  // Browsers can block sound until the person taps something. Then we show "Tap to hear the room".
  const [audioBlocked, setAudioBlocked] = useState(false);
  // Room chat lives only in memory, for as long as you're in the room.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatSentAt = useRef<number[]>([]);
  const chatHeardAt = useRef(new Map<string, number[]>());
  const chatCount = useRef(0);

  const addMessage = useCallback((m: Omit<ChatMessage, 'id'>) => {
    chatCount.current += 1;
    const id = `${m.at}-${chatCount.current}`;
    setMessages((list) => [...list, { ...m, id }].slice(-CHAT_KEEP));
  }, []);

  const applySilence = useCallback((p: RemoteParticipant) => {
    p.setVolume(silenced.current.has(p.identity) ? 0 : 1);
  }, []);

  const refresh = useCallback(() => {
    const current = roomRef.current;
    if (!current) return;
    const remote = Array.from(current.remoteParticipants.values()).map((p) => toPerson(p, false));
    remote.sort((a, b) => a.joinedAt - b.joinedAt);
    for (const p of remote) {
      const before = seen.current.get(p.id);
      seen.current.set(p.id, {
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        spoke: (before?.spoke ?? false) || p.isSpeaking,
      });
    }
    setPeople([toPerson(current.localParticipant, true), ...remote]);
    setNumbers((n) => ({ ...n, quality: current.localParticipant.connectionQuality ?? ConnectionQuality.Unknown }));
  }, []);

  // Leaves and returns what happened in the room, for the after-room screen.
  const leave = useCallback(async (finalStatus: RoomStatus = 'idle'): Promise<RoomSummary | null> => {
    attempt.current += 1;
    const current = roomRef.current;
    roomRef.current = null;
    const summary: RoomSummary | null =
      current && room
        ? {
            room,
            minutes: Math.max(1, Math.round((Date.now() - connectedAt.current) / 60000)),
            seen: Array.from(seen.current.values()),
          }
        : null;
    if (summary) setLastSummary(summary);
    setStatus(finalStatus);
    setPeople([]);
    setMessages([]);
    setNumbers(NO_NUMBERS);
    try {
      await current?.disconnect();
    } finally {
      await stopAudio();
      await stopRoomService();
    }
    return summary;
  }, [room]);

  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  const join = useCallback(
    async (request: RoomRequest) => {
      if (roomRef.current) return;
      const mine = ++attempt.current;
      const cancelled = () => attempt.current !== mine;
      startedAt.current = Date.now();
      seen.current = new Map();
      setMessages([]);
      chatSentAt.current = [];
      chatHeardAt.current = new Map();
      setStatus('connecting');
      setRoom(null);
      try {
        const ticket = await getTicket(request);
        if (cancelled()) return;
        setRoom(ticket.room);

        // The "You're in a room" notification keeps voice alive with the screen locked, for everyone.
        // People who can talk get the microphone kind; listeners get the media kind.
        await requestNotificationPermission();
        await startRoomService(ticket.room.title, await micPermissionGranted());
        if (cancelled()) {
          await stopRoomService();
          return;
        }

        await startAudio();
        if (cancelled()) {
          await stopRoomService();
          return;
        }

        const lkRoom = new Room();
        roomRef.current = lkRoom;

        lkRoom
          .on(RoomEvent.ParticipantConnected, (p) => {
            applySilence(p);
            refresh();
          })
          .on(RoomEvent.ParticipantDisconnected, refresh)
          .on(RoomEvent.ActiveSpeakersChanged, refresh)
          .on(RoomEvent.TrackMuted, refresh)
          .on(RoomEvent.TrackUnmuted, refresh)
          .on(RoomEvent.LocalTrackPublished, refresh)
          .on(RoomEvent.LocalTrackUnpublished, refresh)
          .on(RoomEvent.ConnectionQualityChanged, refresh)
          .on(RoomEvent.ParticipantAttributesChanged, refresh)
          .on(RoomEvent.Reconnecting, () => setStatus('reconnecting'))
          .on(RoomEvent.Reconnected, () => {
            setStatus('connected');
            refresh();
          })
          .on(RoomEvent.Disconnected, () => {
            if (roomRef.current === lkRoom) void leaveRef.current('dropped');
          })
          .on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!lkRoom.canPlaybackAudio))
          .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
            // The sender's name comes from LiveKit, set by our server only (the ticket can't change it),
            // so nobody can pretend to be someone else.
            if (topic !== CHAT_TOPIC || !participant) return;
            if (silenced.current.has(participant.identity)) return;
            const now = Date.now();
            const heard = (chatHeardAt.current.get(participant.identity) ?? []).filter((t) => now - t < 60_000);
            // A phone sending faster than the app allows is ignored, so nobody can flood the chat.
            if (tooFastFrom(heard, now)) return;
            const text = decodeChat(payload);
            if (!text) return;
            chatHeardAt.current.set(participant.identity, [...heard, now]);
            addMessage({ from: participant.identity, nickname: participant.name || 'Someone', text, at: now, mine: false });
          })
          .on(RoomEvent.TrackUnsubscribed, (track) => {
            if (track.kind === Track.Kind.Audio) stopRemoteAudio(track);
          })
          .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
            applySilence(participant);
            if (track.kind !== Track.Kind.Audio) return;
            playRemoteAudio(track);
            setNumbers((n) =>
              n.firstVoiceMs === null ? { ...n, firstVoiceMs: Date.now() - startedAt.current } : n,
            );
          });

        await lkRoom.connect(ticket.url, ticket.token);
        if (cancelled()) return;
        connectedAt.current = Date.now();
        setAudioBlocked(!lkRoom.canPlaybackAudio);
        lkRoom.remoteParticipants.forEach(applySilence);
        setNumbers((n) => ({ ...n, joinMs: Date.now() - startedAt.current }));
        setStatus('connected');
        refresh();
      } catch (e) {
        if (cancelled()) return;
        await leaveRef.current(
          e instanceof RoomFullError
            ? 'full'
            : e instanceof NoHostError
              ? 'noHost'
              : e instanceof PausedError
                ? 'paused'
                : e instanceof RoomEndedError
                  ? 'ended'
                  : e instanceof TooManyRoomsError
                    ? 'tooMany'
                    : e instanceof BadTitleError
                      ? 'badTitle'
                      : 'error',
        );
      }
    },
    [applySilence, refresh, addMessage],
  );

  // Sends a chat message to everyone in the room.
  const sendChat = useCallback(
    async (raw: string): Promise<'sent' | 'empty' | 'tooFast' | 'failed'> => {
      const current = roomRef.current;
      const text = cleanChat(raw);
      if (!text) return 'empty';
      if (!current) return 'failed';
      const now = Date.now();
      chatSentAt.current = chatSentAt.current.filter((t) => now - t < 60_000);
      if (tooFast(chatSentAt.current, now)) return 'tooFast';
      try {
        await current.localParticipant.publishData(encodeChat(text), { reliable: true, topic: CHAT_TOPIC });
      } catch {
        return 'failed';
      }
      chatSentAt.current.push(now);
      const me = current.localParticipant;
      addMessage({ from: me.identity, nickname: me.name || 'You', text, at: now, mine: true });
      return 'sent';
    },
    [addMessage],
  );

  // Returns false when the phone does not allow the microphone.
  const setMic = useCallback(
    async (on: boolean): Promise<boolean> => {
      const current = roomRef.current;
      if (!current) return false;
      try {
        await current.localParticipant.setMicrophoneEnabled(on);
        refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  // Raise or lower your hand. Everyone in the room sees it on your seat.
  const setHand = useCallback(
    async (up: boolean): Promise<boolean> => {
      if (!roomRef.current || !room) return false;
      try {
        await setHandUp(room.id, up);
        return true;
      } catch {
        return false;
      }
    },
    [room],
  );

  // Blocked people: you stop hearing them straight away.
  const silence = useCallback((personId: string) => {
    silenced.current.add(personId);
    roomRef.current?.remoteParticipants.forEach((p) => {
      if (p.identity === personId) p.setVolume(0);
    });
  }, []);

  const setSilencedList = useCallback(
    (ids: string[]) => {
      silenced.current = new Set(ids);
      roomRef.current?.remoteParticipants.forEach(applySilence);
    },
    [applySilence],
  );

  const unblockAudio = useCallback(async () => {
    await roomRef.current?.startAudio();
    setAudioBlocked(!(roomRef.current?.canPlaybackAudio ?? true));
  }, []);

  // Called when the mic is allowed after joining as a listener, so voice also survives a locked screen.
  const startBackground = useCallback(async () => {
    await requestNotificationPermission();
    await startRoomService(room?.title ?? 'Circles', true);
  }, [room]);

  useEffect(
    () => () => {
      void leaveRef.current();
    },
    [],
  );

  return {
    status,
    room,
    people,
    numbers,
    lastSummary,
    audioBlocked,
    messages,
    sendChat,
    unblockAudio,
    join,
    leave,
    setMic,
    setHand,
    silence,
    setSilencedList,
    startBackground,
  };
}
