import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { size, space, useColors } from '../theme';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

const RULES = [
  'Be kind. Everyone here is a real person.',
  'Use your nickname only. Never share anyone’s real name, number or location.',
  'No sexual talk, hate, threats, scams or selling.',
  'Everyone gets a turn to talk. Listening is welcome too.',
  'Tap someone to block or report them. They are never told who did it.',
];

export function RoomRulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title">Room rules</Text>
      <View style={{ gap: space[3] }}>
        {RULES.map((rule) => (
          <View key={rule} style={{ flexDirection: 'row', gap: space[3] }}>
            <Check size={size.iconButton20} color={colors.textSoft} strokeWidth={size.iconStroke} />
            <Text variant="body" color="textSoft" style={{ flex: 1 }}>
              {rule}
            </Text>
          </View>
        ))}
      </View>
      <Button label="Got it" onPress={onClose} />
    </Sheet>
  );
}
