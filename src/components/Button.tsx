import { ActivityIndicator, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { lift, opacity, radius, size, space, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  loading,
  disabled,
  accessibilityHint,
  style,
}: Props) {
  const colors = useColors();
  const primary = variant === 'primary';
  const quiet = variant === 'quiet';
  // Danger (red) only ever appears inside a confirm step (design direction, rule 3).
  const danger = variant === 'danger';
  const textColor = disabled ? 'textMeta' : primary || danger ? 'onEmber' : quiet ? 'textSoft' : 'text';
  const height = primary || danger ? size.buttonPrimary : size.minTarget;
  const fill = danger ? colors.danger : primary ? colors.ember : quiet ? 'transparent' : colors.raised;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: height,
          borderRadius: radius.pill,
          paddingHorizontal: space[5],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space[2],
          backgroundColor: disabled && !quiet ? colors.raised : fill,
          opacity: disabled && quiet ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
        primary && !disabled && {
          shadowColor: colors.ember,
          shadowOpacity: 1,
          shadowRadius: lift.radius,
          shadowOffset: { width: 0, height: lift.offset },
          elevation: lift.elevation,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[textColor]} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text variant={primary || danger ? 'button' : 'bodyStrong'} color={textColor}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

