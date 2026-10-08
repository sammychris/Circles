import { View } from 'react-native';
import { Mic } from 'lucide-react-native';
import { radius, size, space, useColors } from '../theme';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

type AskProps = { visible: boolean; onAllow: () => void; onListen: () => void };

// Shown before the phone's own question, so nobody taps "no" by accident.
export function MicAskSheet({ visible, onAllow, onListen }: AskProps) {
  const colors = useColors();
  return (
    <Sheet visible={visible} onClose={onListen}>
      <View style={{ alignItems: 'center', gap: space[4] }}>
        <View
          style={{
            width: size.avatarRoom,
            height: size.avatarRoom,
            borderRadius: radius.pill,
            backgroundColor: colors.emberSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic size={size.icon} color={colors.emberText} strokeWidth={size.iconStroke} />
        </View>
        <Text variant="title" center>
          Circles needs your microphone to let you talk
        </Text>
        <Text variant="body" color="textSoft" center>
          You'll still join muted. Your mic only goes live when you tap the mic button. We never record rooms.
        </Text>
      </View>
      <View style={{ gap: space[3] }}>
        <Button label="Allow microphone" variant="primary" onPress={onAllow} />
        <Button label="Just listen for now" variant="quiet" onPress={onListen} />
      </View>
    </Sheet>
  );
}

type BlockedProps = { visible: boolean; onOpenSettings: () => void; onClose: () => void };

export function MicBlockedSheet({ visible, onOpenSettings, onClose }: BlockedProps) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space[3] }}>
        <Text variant="title">Turn on your microphone</Text>
        <Text variant="body" color="textSoft">
          Settings › Apps › Circles › Permissions › Microphone
        </Text>
      </View>
      <View style={{ gap: space[3] }}>
        <Button label="Open settings" variant="primary" onPress={onOpenSettings} />
        <Button label="Keep listening" variant="quiet" onPress={onClose} />
      </View>
    </Sheet>
  );
}
