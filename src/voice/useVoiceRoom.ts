import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
} from 'livekit-client';
import { playRemoteAudio, startAudio, stopAudio } from './audio';
import { NoHostError, PausedError, RoomFullError, getTicket, type RoomInfo, type RoomRequest } from '../rooms/api';
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

function toPerson(p: Participant, isMe: boolean): Person {
  return {
    id: p.identity,
    nickname: p.name || 'Someone',
    isMe,
    isHost: hostFlag(p),
    isSpeaking: p.isSpeaking,
    isMuted: !p.isMicrophoneEnabled,
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
          .on(RoomEvent.Reconnecting, () => setStatus('reconnecting'))
          .on(RoomEvent.Reconnected, () => {
            setStatus('connected');
            refresh();
          })
          .on(RoomEvent.Disconnected, () => {
            if (roomRef.current === lkRoom) void leaveRef.current('dropped');
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
                : 'error',
        );
      }
    },
    [applySilence, refresh],
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

  return { status, room, people, numbers, lastSummary, join, leave, setMic, silence, setSilencedList, startBackground };
}
