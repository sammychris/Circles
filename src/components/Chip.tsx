import type { ComponentType } from 'react';
import { View } from 'react-native';
import { radius, size, space } from '../theme';
import { Text } from './Text';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

// 32 tall, not tappable (design direction › Chip). Always an icon and a word, never colour alone.
export function Chip({ Icon, label, fg, bg }: { Icon: Icon; label: string; fg: string; bg: string }) {
  return (
    <View
      style={{
        height: size.chip,
        borderRadius: radius.pill,
        paddingHorizontal: space[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}
    >
      <Icon size={size.iconMeta} color={fg} strokeWidth={size.iconStroke} />
      <Text variant="metaStrong" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
