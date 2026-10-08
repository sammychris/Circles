import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { RemovalReason } from '../../rooms/api';
import { border, fonts, radius, rules, size, space, type, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { RadioRow, SwitchRow } from '../Choice';
import { Sheet } from '../Sheet';
import { Text } from '../Text';

function waited(handAt: number, now: number): string {
  const min = Math.floor(Math.max(0, now - handAt) / 60000);
  return min < 1 ? 'Just now' : `Waiting ${min} min`;
}

// Raised hands, oldest first (room-host-view.md › Raised hands sheet). "Let in" tells them they can
// talk now; they stay muted until they unmute themselves. "Not now" lowers their hand, with no reason.
export function HandsSheet({
  visible,
  hands,
  onClose,
  onLetIn,
  onNotNow,
}: {
  visible: boolean;
  hands: Person[];
  onClose: () => void;
  onLetIn: (p: Person) => void;
  onNotNow: (p: Person) => void;
}) {
  const now = Date.now();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title" accessibilityRole="header">
        {hands.length > 0 ? `Hands up · ${hands.length}` : 'Hands up'}
      </Text>
      {hands.length === 0 ? (
        <Text variant="body" color="textSoft">
          No hands up.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: size.sheetList }} contentContainerStyle={{ gap: space[3] }}>
          {hands.map((p) => (
            <View key={p.id} style={{ gap: space[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{p.nickname}</Text>
                  <Text variant="meta" color="textMeta">
                    {waited(p.handAt, now)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                <Button label="Let in" onPress={() => onLetIn(p)} style={{ flex: 1 }} />
                <Button label="Not now" variant="quiet" onPress={() => onNotNow(p)} style={{ flex: 1 }} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

// Tapping a person, for a trained host (room-host-view.md › Host actions sheet).
export function HostActionsSheet({
  person,
  onClose,
  onMute,
  onRemove,
  onMore,
}: {
  person: Person | null;
  onClose: () => void;
  onMute: (p: Person) => void;
  onRemove: (p: Person) => void;
  // Save, block and report, like everyone else.
  onMore: (p: Person) => void;
}) {
  return (
    <Sheet visible={!!person} onClose={onClose}>
      {person ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Avatar userId={person.id} nickname={person.nickname} diameter={size.avatarList} />
            <View style={{ flex: 1 }}>
              <Text variant="title">{person.nickname}</Text>
              <Text variant="meta" color="textMeta">
                {person.isSpeaking ? 'Speaking' : person.isMuted ? 'Muted' : 'Mic on'}
                {person.handUp ? ' · Hand up' : ''}
              </Text>
            </View>
          </View>
          <View style={{ gap: space[3] }}>
            {!person.isMuted ? <Button label="Mute" onPress={() => onMute(person)} /> : null}
            <Button label="Save, block or report" onPress={() => onMore(person)} />
            <Pressable
              accessibilityRole="button"
              onPress={() => onRemove(person)}
              style={{ minHeight: size.buttonSecondary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text variant="bodyStrong" color="danger">
                Remove from room
              </Text>
            </Pressable>
          </View>
          <Text variant="meta" color="textMeta">
            They can unmute themselves after you mute them. Removing someone keeps them out of this room until it ends.
          </Text>
        </>
      ) : null}
    </Sheet>
  );
}

export const REMOVAL_REASONS: { id: RemovalReason; title: string; rule: string }[] = [
  { id: 'unkind', title: 'Unkind or insulting', rule: 'Be kind. Everyone here is a person.' },
  { id: 'sexual', title: 'Sexual or creepy', rule: 'No sexual talk or requests, ever.' },
  { id: 'spam', title: 'Spam or selling', rule: 'No scams, spam or selling.' },
  { id: 'off_topic', title: 'Off-topic after a warning', rule: 'Keep to what the room is for.' },
  { id: 'other', title: 'Other', rule: 'Follow the room rules.' },
];

// "Remove NightRunner?" with a required reason. Can't be dismissed by tapping outside.
export function RemoveSheet({
  person,
  onClose,
  onRemove,
}: {
  person: Person | null;
  onClose: () => void;
  onRemove: (p: Person, reason: RemovalReason, alsoReport: boolean) => void;
}) {
  const [reason, setReason] = useState<RemovalReason | null>(null);
  const [report, setReport] = useState(false);
  useEffect(() => {
    setReason(null);
    setReport(false);
  }, [person]);
  return (
    <Sheet visible={!!person} onClose={onClose} dismissable={false}>
      {person ? (
        <>
          <Text variant="title" accessibilityRole="header">{`Remove ${person.nickname}?`}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
            {REMOVAL_REASONS.map((r) => (
              <RadioRow
                key={r.id}
                title={r.title}
                selected={reason === r.id}
                onPress={() => {
                  setReason(r.id);
                  if (r.id === 'sexual') setReport(true);
                }}
              />
            ))}
          </View>
          <SwitchRow title="Also report to the Circles team" value={report} onChange={setReport} />
          <View style={{ gap: space[3] }}>
            <Button label="Remove" variant="danger" disabled={!reason} onPress={() => reason && onRemove(person, reason, report)} />
            <Button label="Cancel" variant="quiet" onPress={onClose} />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

// "This wasn't fair": a short note that goes to the Circles team with the removal.
export function AppealSheet({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (text: string) => void }) {
  const colors = useColors();
  const [text, setText] = useState('');
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title" accessibilityRole="header">
        This wasn't fair
      </Text>
      <Text variant="body" color="textSoft">
        Tell the Circles team what happened. They'll look at it with the host's reason.
      </Text>
      <TextInput
        accessibilityLabel="What happened"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={300}
        maxFontSizeMultiplier={rules.maxTextScale}
        placeholderTextColor={colors.textMeta}
        selectionColor={colors.ember}
        style={{
          minHeight: size.input * 2,
          padding: space[4],
          borderRadius: radius.small,
          borderWidth: border.input,
          borderColor: colors.line,
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: type.body.fontSize,
          textAlignVertical: 'top',
        }}
      />
      <Button label="Send" variant="primary" disabled={!text.trim()} onPress={() => onSend(text.trim())} />
    </Sheet>
  );
}
