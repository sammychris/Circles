import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import { opacity, radius, size, useColors } from '../theme';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

// The icons at the top right of the main tabs (the bell on Home, + on People). A dot means something new;
// the label says so too, never the dot alone.
export function TopIcon({ Icon, label, dot = false, onPress }: { Icon: Icon; label: string; dot?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dot ? `${label}, something new` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size.minTarget,
        height: size.minTarget,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <Icon size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
      {dot ? (
        <View
          style={{
            position: 'absolute',
            top: size.minTarget / 4,
            right: size.minTarget / 4,
            width: size.newDot,
            height: size.newDot,
            borderRadius: radius.pill,
            backgroundColor: colors.ember,
          }}
        />
      ) : null}
    </Pressable>
  );
}
