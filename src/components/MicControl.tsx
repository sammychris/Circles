import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mic, MicOff } from 'lucide-react-native';
import { border, lift, opacity, radius, size, space, useColors } from '../theme';
import { Text } from './Text';

export type MicState = 'muted' | 'live' | 'notAllowed' | 'blocked' | 'paused';

const COPY: Record<MicState, { title: string; hint: string }> = {
  muted: { title: "You're muted", hint: 'Tap to talk' },
  live: { title: "You're live", hint: 'Tap to mute' },
  notAllowed: { title: 'Mic not allowed', hint: 'Tap to turn on' },
  blocked: { title: 'Mic is off in your phone settings', hint: 'Tap to fix' },
  paused: { title: 'Mic paused', hint: 'Waiting for someone to join' },
};

export function MicControl({
  state,
  onPress,
  pausedReason,
}: {
  state: MicState;
  onPress: () => void;
  // Why the room paused mics, e.g. "Waiting for a host".
  pausedReason?: string;
}) {
  const colors = useColors();
  const { title } = COPY[state];
  const hint = state === 'paused' && pausedReason ? pausedReason : COPY[state].hint;
  const paused = state === 'paused';
  const muted = state === 'muted';
  const live = state === 'live';

  const fill = muted ? colors.ember : live ? colors.liveSoft : colors.raised;
  const textColor = muted ? 'onEmber' : live ? 'text' : 'textSoft';
  const iconColor = muted ? colors.onEmber : live ? colors.live : colors.textSoft;
  const Icon = live ? Mic : MicOff;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      accessibilityLiveRegion="polite"
      accessibilityState={{ disabled: paused }}
      disabled={paused}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        {
          height: size.micControl,
          borderRadius: radius.pill,
          backgroundColor: fill,
          borderWidth: live ? border.selected : 0,
          borderColor: colors.live,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space[3],
          opacity: pressed ? opacity.pressed : 1,
        },
        muted && {
          shadowColor: colors.ember,
          shadowOpacity: 1,
          shadowRadius: lift.radius,
          shadowOffset: { width: 0, height: lift.offset },
          elevation: lift.elevation,
        },
      ]}
    >
      <Icon size={size.icon} color={iconColor} strokeWidth={size.iconStroke} />
      <View>
        <Text variant="heading" color={textColor} numberOfLines={2}>
          {title}
        </Text>
        <Text variant="meta" color={textColor}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}
