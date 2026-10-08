import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { size, space, useColors } from '../theme';
import { Text } from './Text';

export function ErrorLine({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }} accessibilityLiveRegion="polite">
      <AlertTriangle size={size.iconMeta} color={colors.danger} strokeWidth={size.iconStroke} />
      <Text variant="meta" color="danger" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}
