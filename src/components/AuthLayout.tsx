import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { size, space, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  title: string;
  body?: string;
  onBack?: () => void;
  // Read out by screen readers, e.g. when going back also signs you out.
  backHint?: string;
  children?: ReactNode;
  // The main action, pinned to the bottom (design direction 12b, rule 1).
  footer: ReactNode;
};

// One shape for every sign-up screen: back, one question, the fields, then the main action at the bottom.
export function AuthLayout({ title, body, onBack, backHint, children, footer }: Props) {
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ minHeight: size.minTarget, paddingHorizontal: space[3], justifyContent: 'center' }}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              accessibilityHint={backHint}
              onPress={onBack}
              style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[4], paddingBottom: space[5], gap: space[6] }}
        >
          <View style={{ gap: space[2] }}>
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
            {body ? (
              <Text variant="body" color="textSoft">
                {body}
              </Text>
            ) : null}
          </View>
          {children}
        </ScrollView>
        <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
