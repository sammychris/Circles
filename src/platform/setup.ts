import { registerGlobals } from '@livekit/react-native';
import { registerForegroundService } from '../voice/foregroundService';

// Phones: WebRTC for LiveKit, and the "You're in a room" service. Must run before anything touches voice.
export function setupPlatform() {
  registerGlobals();
  registerForegroundService();
}
