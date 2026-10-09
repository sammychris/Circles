import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { radius, space, useColors } from '../theme';
import { Text } from './Text';

const SHOW_MS = 3000;

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const colors = useColors();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => done.current(), SHOW_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: 'center',
        backgroundColor: colors.raised,
        borderRadius: radius.pill,
        paddingHorizontal: space[5],
        paddingVertical: space[3],
      }}
    >
      <Text variant="bodyStrong">{message}</Text>
    </View>
  );
}
