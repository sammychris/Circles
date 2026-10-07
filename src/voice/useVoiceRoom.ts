import { useCallback, useEffect, useRef, useState } from 'react';
import { AndroidAudioTypePresets, AudioSession } from '@livekit/react-native';
import { ConnectionQuality, Room, RoomEvent, Track, type Participant } from 'livekit-client';
import { TEST_ROOM_ID } from '../config';
import {
  micPermissionGranted,
  requestNotificationPermission,
  startRoomService,
  stopRoomService,
} from './foregroundService';
import { RoomFullError, fetchRoomTicket } from './token';

export type Person = {
  id: string;
  nickname: string;
  isMe: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  joinedAt: number;
};

export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'full' | 'error' | 'dropped';

export type JoinNumbers = {
  joinMs: number | null;
  firstVoiceMs: number | null;
  quality: 'excellent' | 'good' | 'poor' | 'lost' | 'unknown';
};

function toPerson(p: Participant, isMe: boolean): Person {
  return {
    id: p.identity,
    nickname: p.name || 'Someone',
    isMe,
    isSpeaking: p.isSpeaking,
    isMuted: !p.isMicrophoneEnabled,
    joinedAt: p.joinedAt ? p.joinedAt.getTime() : 0,
  };
}

export function useVoiceRoom(roomTitle: string) {
  const roomRef = useRef<Room | null>(null);
  const startedAt = useRef(0);
  // Bumped on every leave, so a join that is still waiting knows it was cancelled.
  const attempt = useRef(0);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [people, setPeople] = useState<Person[]>([]);
  const [numbers, setNumbers] = useState<JoinNumbers>({ joinMs: null, firstVoiceMs: null, quality: 'unknown' });

  const refresh = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const remote = Array.from(room.remoteParticipants.values()).map((p) => toPerson(p, false));
    remote.sort((a, b) => a.joinedAt - b.joinedAt);
    setPeople([toPerson(room.localParticipant, true), ...remote]);
    setNumbers((n) => ({ ...n, quality: room.localParticipant.connectionQuality ?? ConnectionQuality.Unknown }));
  }, []);

  const leave = useCallback(async (finalStatus: RoomStatus = 'idle') => {
    attempt.current += 1;
    const room = roomRef.current;
    roomRef.current = null;
    setStatus(finalStatus);
    setPeople([]);
    setNumbers({ joinMs: null, firstVoiceMs: null, quality: 'unknown' });
    try {
      await room?.disconnect();
    } finally {
      await AudioSession.stopAudioSession();
      await stopRoomService();
    }
  }, []);

  const join = useCallback(async () => {
    if (roomRef.current || status === 'connecting') return;
    const mine = ++attempt.current;
    const cancelled = () => attempt.current !== mine;
    startedAt.current = Date.now();
    setStatus('connecting');
    try {
      const ticket = await fetchRoomTicket(TEST_ROOM_ID);
      if (cancelled()) return;

      // The "You're in a room" notification keeps voice alive with the screen locked, for everyone in the
      // room. People who can talk get the microphone kind; listeners get the media kind.
      await requestNotificationPermission();
      await startRoomService(roomTitle, await micPermissionGranted());
      if (cancelled()) {
        await stopRoomService();
        return;
      }

      await AudioSession.configureAudio({
        android: { audioTypeOptions: AndroidAudioTypePresets.communication },
      });
      await AudioSession.startAudioSession();

      if (cancelled()) {
        await stopRoomService();
        return;
      }
      const room = new Room();
      roomRef.current = room;

      room
        .on(RoomEvent.ParticipantConnected, refresh)
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
          if (roomRef.current === room) void leave('dropped');
        })
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== Track.Kind.Audio) return;
          setNumbers((n) =>
            n.firstVoiceMs === null ? { ...n, firstVoiceMs: Date.now() - startedAt.current } : n,
          );
        });

      await room.connect(ticket.url, ticket.token);
      if (cancelled()) return;
      setNumbers((n) => ({ ...n, joinMs: Date.now() - startedAt.current }));
      setStatus('connected');
      refresh();
    } catch (e) {
      if (cancelled()) return;
      await leave(e instanceof RoomFullError ? 'full' : 'error');
    }
  }, [leave, refresh, roomTitle, status]);

  // Returns false when the phone does not allow the microphone.
  const setMic = useCallback(
    async (on: boolean): Promise<boolean> => {
      const room = roomRef.current;
      if (!room) return false;
      try {
        await room.localParticipant.setMicrophoneEnabled(on);
        refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  // Called when the mic is allowed after joining as a listener, so voice also survives a locked screen.
  const startBackground = useCallback(async () => {
    await requestNotificationPermission();
    await startRoomService(roomTitle, true);
  }, [roomTitle]);

  useEffect(
    () => () => {
      void leave();
    },
    [],
  );

  return { status, people, numbers, join, leave, setMic, startBackground };
}
