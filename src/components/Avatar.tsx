import { View } from 'react-native';
import { avatarTints, radius, size } from '../theme';
import { initialOf, tintIndex } from '../lib/seats';
import { Text } from './Text';

export function Avatar({ userId, nickname, diameter = size.avatarRoom }: { userId: string; nickname: string; diameter?: number }) {
  const tint = avatarTints[tintIndex(userId, avatarTints.length)];
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
      <Text variant="title" style={{ color: tint.fg }}>
        {initialOf(nickname)}
      </Text>
    </View>
  );
}
