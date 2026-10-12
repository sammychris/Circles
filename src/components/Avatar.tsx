import { View } from 'react-native';
import { SYMBOLS, useLook, type Look } from '../lib/avatars';
import { avatarTints, radius, size } from '../theme';
import { initialOf, tintIndex } from '../lib/seats';
import { Text } from './Text';

// A colour and an initial, or the colour and symbol the person chose (Me › Edit). Never a photo.
// `look` draws a choice not saved yet (the Edit preview).
export function Avatar({ userId, nickname, diameter = size.avatarRoom, look }: { userId: string; nickname: string; diameter?: number; look?: Look }) {
  const saved = useLook(userId);
  const chosen = look ?? saved;
  const tint = avatarTints[chosen?.tint ?? tintIndex(userId, avatarTints.length)] ?? avatarTints[0];
  const Symbol = chosen?.symbol ? SYMBOLS[chosen.symbol] : null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: radius.pill,
        backgroundColor: tint.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Symbol ? (
        <Symbol size={Math.round(diameter * 0.5)} color={tint.fg} strokeWidth={size.iconStroke} />
      ) : (
        <Text variant="title" style={{ color: tint.fg }}>
          {initialOf(nickname)}
        </Text>
      )}
    </View>
  );
}
