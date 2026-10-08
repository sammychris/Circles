import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import { registerForegroundService } from './src/voice/foregroundService';

// Both must run before anything else touches voice.
registerGlobals();
registerForegroundService();

registerRootComponent(App);
