import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, sheetHandle, space, useColors } from '../theme';

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessible={false}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: space.gutter,
            paddingTop: space[3],
            paddingBottom: space[5] + insets.bottom,
            gap: space[5],
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: sheetHandle.width,
              height: sheetHandle.height,
              borderRadius: radius.pill,
              backgroundColor: colors.seatEmpty,
            }}
          />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
