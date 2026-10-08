import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Heart, Phone, X } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { CRISIS_LINE, EMERGENCY_NUMBER } from '../content/helplines';
import { radius, size, space, useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

function CallCard({ Icon, iconColor, title, line, number }: { Icon: Icon; iconColor: string; title: string; line: string; number: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: space[4],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
      }}
    >
      <Icon size={size.icon} color={iconColor} strokeWidth={size.iconStroke} />
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="meta" color="textSoft">
          {line}
        </Text>
      </View>
      <Button label="Call" onPress={() => void Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`)} />
    </View>
  );
}

// "You don't have to carry this alone" (docs/screens/03-need-more-help.png). Opens over the room,
// so voice keeps going. Nobody in the room can see that it was opened.
export function HelpModal({ visible, onClose, inRoom }: { visible: boolean; onClose: () => void; inRoom: boolean }) {
  const colors = useColors();
  const noNumbers = !CRISIS_LINE && !EMERGENCY_NUMBER;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
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
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space[6], gap: space[5] }}>
          <View
            style={{
              width: size.avatarRoom,
              height: size.avatarRoom,
              borderRadius: radius.pill,
              backgroundColor: colors.emberTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={size.icon} color={colors.helpIcon} strokeWidth={size.iconStroke} />
          </View>
          <Text variant="display" accessibilityRole="header">
            You don't have to carry this alone
          </Text>
          <Text variant="body" color="textSoft">
            {inRoom
              ? 'If tonight feels like too much, talk to someone trained to help. Nobody in the room can see that you opened this.'
              : 'If tonight feels like too much, talk to someone trained to help.'}
          </Text>

          {CRISIS_LINE ? (
            <CallCard Icon={Phone} iconColor={colors.textSoft} title="Crisis support line" line={CRISIS_LINE.name} number={CRISIS_LINE.number} />
          ) : null}
          {EMERGENCY_NUMBER ? (
            <CallCard
              Icon={AlertTriangle}
              iconColor={colors.danger}
              title="In danger right now?"
              line={`Call ${EMERGENCY_NUMBER}`}
              number={EMERGENCY_NUMBER}
            />
          ) : null}
          {noNumbers ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4], gap: space[2] }}>
              <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
                <AlertTriangle size={size.icon} color={colors.danger} strokeWidth={size.iconStroke} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  In danger right now?
                </Text>
              </View>
              <Text variant="body" color="textSoft">
                Contact your local emergency services, or go to the nearest hospital. If you can, tell someone you
                trust, like a friend or family member, how you're feeling.
              </Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>
          <Button label={inRoom ? 'Back to the room' : 'Close'} variant="quiet" onPress={onClose} />
          {inRoom ? (
            <Text variant="meta" color="textMeta" center>
              The host isn't told. You can open this again any time.
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
