import { AndroidAudioTypePresets, AudioSession } from '@livekit/react-native';
import type { Track } from 'livekit-client';

// Phones: a two-way "call" audio session (echo cancellation on).
export async function startAudio() {
  await AudioSession.configureAudio({ android: { audioTypeOptions: AndroidAudioTypePresets.communication } });
  await AudioSession.startAudioSession();
}

export async function stopAudio() {
  await AudioSession.stopAudioSession();
}

// On phones remote audio plays by itself.
export function playRemoteAudio(_track: Track) {}

export function stopRemoteAudio(_track: Track) {}
