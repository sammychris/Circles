import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { lift, opacity, radius, size, space, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
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
  const textColor = disabled ? 'textMeta' : primary ? 'onEmber' : quiet ? 'textSoft' : 'text';
  const height = primary ? size.buttonPrimary : size.minTarget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          backgroundColor: disabled && !quiet ? colors.raised : primary ? colors.ember : quiet ? 'transparent' : colors.raised,
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
          <Text variant={primary ? 'button' : 'bodyStrong'} color={textColor}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

