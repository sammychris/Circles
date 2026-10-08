import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { border, opacity, radius, size, space, useColors } from '../theme';
import { Text } from './Text';

// A single-choice row (radio). Selected: 2 px warm-white border and a check, never colour alone.
export function RadioRow({
  title,
  line,
  selected,
  onPress,
  leading,
  disabled = false,
}: {
  title: string;
  line?: string;
  selected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={line ? `${title}. ${line}` : title}
      onPress={onPress}
      disabled={disabled}
      style={{
        opacity: disabled ? opacity.disabled : 1,
        minHeight: size.minTarget + space[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        borderRadius: radius.small,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        backgroundColor: selected ? colors.raised : colors.bg,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{title}</Text>
        {line ? (
          <Text variant="meta" color="textMeta">
            {line}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: size.icon,
          height: size.icon,
          borderRadius: radius.pill,
          borderWidth: border.selected,
          borderColor: selected ? colors.text : colors.line,
          backgroundColor: selected ? colors.text : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Check size={size.iconMeta} color={colors.bg} strokeWidth={size.iconStroke} /> : null}
      </View>
    </Pressable>
  );
}

// 52 × 32 switch with its label; the whole row is tappable.
export function SwitchRow({
  title,
  line,
  value,
  onChange,
}: {
  title: string;
  line?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={line ? `${title}. ${line}` : title}
      onPress={() => onChange(!value)}
      style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[3] }}
    >
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{title}</Text>
        {line ? (
          <Text variant="meta" color="textSoft">
            {line}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: size.switchWidth,
          height: size.switchHeight,
          borderRadius: radius.pill,
          backgroundColor: value ? colors.text : colors.raised,
          padding: space[1],
          alignItems: value ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size.switchHeight - space[2],
            height: size.switchHeight - space[2],
            borderRadius: radius.pill,
            backgroundColor: value ? colors.bg : colors.textMeta,
          }}
        />
      </View>
    </Pressable>
  );
}
