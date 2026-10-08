import { VideoView } from '@livekit/react-native';
import type { VideoTrack } from 'livekit-client';

// Someone's shared screen, drawn by LiveKit's own video view.
export function ScreenView({ track }: { track: VideoTrack }) {
  return <VideoView videoTrack={track} objectFit="contain" style={{ flex: 1 }} />;
}
