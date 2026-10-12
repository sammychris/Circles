import { Lightbulb, MessageCircle, Smile } from 'lucide-react-native';
import { moodColors } from '../theme';
import type { Mood } from './api';

// Mood colours appear only on the small mood icon and the mood chip (design direction › Mood colours).
export const MOOD_STYLE: Record<Mood, { label: string; Icon: typeof Smile; fg: string; bg: string }> = {
  chat: { label: 'Just talk', Icon: MessageCircle, ...moodColors.down },
  laugh: { label: 'Have a laugh', Icon: Smile, ...moodColors.laugh },
  advice: { label: 'Get advice', Icon: Lightbulb, ...moodColors.advice },
};
