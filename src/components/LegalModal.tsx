import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { LEGAL_UPDATED, type LegalDoc } from '../content/legal';
import { size, space, useColors } from '../theme';
import { Text } from './Text';

// Shows the Privacy Policy or the Terms, readable before signing up (from Welcome) and any time from Me.
export function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  const colors = useColors();
  return (
    <Modal visible={!!doc} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ minHeight: size.minTarget, paddingHorizontal: space[3], alignItems: 'flex-end', justifyContent: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
          </Pressable>
        </View>
        {doc ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space[7], gap: space[5] }}>
            <View style={{ gap: space[2] }}>
              <Text variant="display" accessibilityRole="header">
                {doc.title}
              </Text>
              <Text variant="meta" color="textMeta">{`Last updated ${LEGAL_UPDATED}`}</Text>
            </View>
            <Text variant="body" color="textSoft">
              {doc.intro}
            </Text>
            {doc.sections.map((section) => (
              <View key={section.heading} style={{ gap: space[2] }}>
                <Text variant="heading" accessibilityRole="header">
                  {section.heading}
                </Text>
                {section.paragraphs.map((p) => (
                  <Text key={p} variant="body" color="textSoft">
                    {p}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
