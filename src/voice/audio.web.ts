import type { Track } from 'livekit-client';

export async function startAudio() {}

// Removes the hidden <audio> elements that played other people's voices.
export async function stopAudio() {
  document.querySelectorAll('audio[data-circles]').forEach((el) => el.remove());
}

// In a browser, other people's voices need an <audio> element to play.
export function playRemoteAudio(track: Track) {
  const el = track.attach();
  el.setAttribute('data-circles', '');
  document.body.appendChild(el);
}

// Someone left or stopped talking: remove their player.
export function stopRemoteAudio(track: Track) {
  track.detach().forEach((el) => el.remove());
}
