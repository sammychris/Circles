import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { border, fonts, radius, rules, size, space, type, useColors } from '../theme';
import { ErrorLine } from './ErrorLine';
import { Text } from './Text';

type Props = TextInputProps & {
  label: string;
  helper?: string;
  error?: string | null;
  // Red border with no message of its own, for fields that share one message (Day, Month, Year).
  invalid?: boolean;
};

// Visible label above, 56 tall, helper or error line below (design direction, Text input).
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, helper, error, invalid, style, onFocus, onBlur, ...rest },
  ref,
) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const borderColor = error || invalid ? colors.danger : focused ? colors.text : colors.line;

  return (
    <View style={[{ gap: space[2] }, style]}>
      <Text variant="bodyStrong" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? helper}
        placeholderTextColor={colors.textMeta}
        selectionColor={colors.ember}
        maxFontSizeMultiplier={rules.maxTextScale}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          minHeight: size.input,
          paddingHorizontal: space[4],
          borderRadius: radius.small,
          borderWidth: border.input,
          borderColor,
          backgroundColor: colors.surface,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: type.body.fontSize,
        }}
        {...rest}
      />
      {error ? (
        <ErrorLine message={error} />
      ) : helper ? (
        <Text variant="meta" color="textMeta">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});
