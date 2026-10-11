import { Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { border, fonts, opacity, radius, size, space, useColors } from '../theme';
import { Text } from './Text';

// A tappable pill, one of a set (Rooms filters, Learn categories). `disabled` greys it out for things that don't exist yet.
export function FilterChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.minTarget,
        paddingHorizontal: space[4],
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.raised : colors.surface,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      {/* Never colour alone: the selected chip also has a check. */}
      {selected ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : null}
      <Text variant="metaStrong" style={selected ? { fontFamily: fonts.extraBold } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
