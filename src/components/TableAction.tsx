import { Pressable } from 'react-native';
import { fonts, opacity, radius, size, type as typeScale, useColors } from '../theme';
import { Text } from './Text';

// Table action button (design direction › Table action button): warm-white fill, strong but not ember,
// so the mic stays the room's one ember action.
export function TableAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        height: size.tableAction,
        borderRadius: radius.pill,
        backgroundColor: colors.text,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={{ color: colors.bg, fontFamily: fonts.extraBold, fontSize: typeScale.body.fontSize }}>{label}</Text>
    </Pressable>
  );
}
