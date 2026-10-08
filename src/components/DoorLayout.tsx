import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { size, space, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  title: string;
  line?: string;
  onBack: () => void;
  children?: ReactNode;
  // The door's one ember "now" button and its helper line, pinned to the bottom.
  footer?: ReactNode;
  header?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

// Every door page has one shape (docs/design/pages/doors.md › Door pages).
export function DoorLayout({ title, line, onBack, children, footer, header, refreshing, onRefresh }: Props) {
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ minHeight: size.minTarget, paddingHorizontal: space[3], justifyContent: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          onPress={onBack}
          style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[3], paddingBottom: space[6], gap: space[6] }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textMeta} />
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
      >
        {header}
        {title || line ? (
        <View style={{ gap: space[2] }}>
          {title ? (
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {line ? (
            <Text variant="body" color="textSoft">
              {line}
            </Text>
          ) : null}
        </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>{footer}</View> : null}
    </SafeAreaView>
  );
}
