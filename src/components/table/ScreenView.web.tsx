import { useEffect, useRef } from 'react';
import type { VideoTrack } from 'livekit-client';

// In a browser, LiveKit plays the shared screen into a plain video element.
export function ScreenView({ track }: { track: VideoTrack }) {
  const el = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = el.current;
    if (!video) return;
    track.attach(video);
    return () => {
      track.detach(video);
    };
  }, [track]);
  return <video ref={el} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
}
