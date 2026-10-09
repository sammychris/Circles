import { registerRootComponent } from 'expo';
import App from './App';
import { setupPlatform } from './src/platform/setup';

setupPlatform();

registerRootComponent(App);
