import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, sheetHandle, space, useColors } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  // Destructive confirms (Block) and sending states can't be dismissed by tapping outside.
  dismissable?: boolean;
};

export function Sheet({ visible, onClose, children, dismissable = true }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismissable ? onClose : () => {}}
      statusBarTranslucent
    >
      {/* Sheets with a text box move up with the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* The scrim sits behind the sheet, so screen readers reach what's inside on its own. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={!dismissable}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <View
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
