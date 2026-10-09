import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Game buzzes (game-mode.md › Buzz). The phone skips them when its vibration is off; browsers have none.
const on = Platform.OS !== 'web';
export const buzz = {
  // Picking a piece or a card.
  light: () => on && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  // A capture, or being hit ("Pick two").
  medium: () => on && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  // Your turn.
  success: () => on && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};
