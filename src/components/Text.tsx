import { Text as RNText, type TextProps } from 'react-native';
import { rules, type, useColors, type Colors } from '../theme';

type Props = TextProps & {
  variant?: keyof typeof type;
  color?: keyof Colors;
  center?: boolean;
};

// Every piece of text goes through here so fonts, sizes and the 130% text-size limit stay consistent.
export function Text({ variant = 'body', color = 'text', center, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <RNText
      maxFontSizeMultiplier={rules.maxTextScale}
      {...rest}
      style={[type[variant], { color: colors[color] }, center && { textAlign: 'center' }, style]}
    />
  );
}
