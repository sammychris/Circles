import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, X } from 'lucide-react-native';
import { CHAT_MAX, type ChatMessage } from '../rooms/chat';
import { border, fonts, opacity, radius, rules, sheetHandle, size, space, type, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  visible: boolean;
  messages: ChatMessage[];
  // Why sending is paused right now (the room isn't live), or null when chat is open.
  pausedReason: string | null;
  onClose: () => void;
  onSend: (text: string) => Promise<'sent' | 'empty' | 'tooFast' | 'failed'>;
  // Tapping a name opens save, block and report for that person.
  onPerson: (person: { id: string; nickname: string }) => void;
};

// Room chat in a bottom sheet (design direction › Bottom sheet). Text only: no photos, no links that
// open, nothing kept after the room.
export function ChatSheet({ visible, messages, pausedReason, onClose, onSend, onPerson }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const list = useRef<ScrollView>(null);
  // Only follow new messages when the person is already at the bottom, not while reading back.
  const atBottom = useRef(true);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) atBottom.current = true;
  }, [visible]);

  useEffect(() => {
    if (visible && atBottom.current) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 0);
  }, [visible, messages.length]);

  const send = async () => {
    if (sending) return;
    setSending(true);
    const result = await onSend(draft);
    setSending(false);
    if (result === 'sent') {
      setDraft('');
      setNote(null);
      atBottom.current = true;
    } else if (result === 'tooFast') setNote('Slow down a little. Try again in a few seconds.');
    else if (result === 'failed') setNote("That didn't send. Check your connection.");
  };

  const paused = !!pausedReason;
  const canSend = draft.trim().length > 0 && !sending && !paused;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior="padding">
        {/* The scrim sits behind the sheet, so screen readers can reach every message on its own. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close chat"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <View
          style={{
            flexShrink: 1,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: space.gutter,
            paddingTop: space[3],
            paddingBottom: space[5] + (keyboardUp ? 0 : insets.bottom),
            marginTop: insets.top,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="title" accessibilityRole="header">
              Chat
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close chat"
              onPress={onClose}
              style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            </Pressable>
          </View>

          <ScrollView
            ref={list}
            style={{ maxHeight: size.sheetList, flexShrink: 1 }}
            contentContainerStyle={{ gap: space[4] }}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={100}
            onScroll={({ nativeEvent: e }) => {
              atBottom.current = e.contentOffset.y + e.layoutMeasurement.height >= e.contentSize.height - space[7];
            }}
          >
            {messages.length === 0 ? (
              <Text variant="body" color="textSoft">
                No messages yet. Say hello. Chat is gone when the room ends.
              </Text>
            ) : (
              messages.map((m) => (
                <View key={m.id} style={{ gap: space[1] }}>
                  {m.mine ? (
                    <Text variant="metaStrong" color="textMeta">
                      You
                    </Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${m.nickname}. Opens save, block and report`}
                      onPress={() => onPerson({ id: m.from, nickname: m.nickname })}
                      style={{ alignSelf: 'flex-start', minHeight: size.minTarget, minWidth: size.minTarget, justifyContent: 'center' }}
                    >
                      <Text variant="metaStrong">{m.nickname}</Text>
                    </Pressable>
                  )}
                  <Text variant="body" color="textSoft" selectable>
                    {m.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {note || pausedReason ? (
            <Text variant="meta" color="textSoft" accessibilityLiveRegion="polite">
              {pausedReason ?? note}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
            <TextInput
              accessibilityLabel="Write a message"
              placeholder={paused ? 'Chat is paused' : 'Write a message'}
              placeholderTextColor={colors.textMeta}
              selectionColor={colors.ember}
              maxFontSizeMultiplier={rules.maxTextScale}
              editable={!paused}
              value={draft}
              onChangeText={setDraft}
              maxLength={CHAT_MAX}
              multiline
              numberOfLines={1}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1,
                minHeight: size.input,
                maxHeight: size.input * 2,
                paddingHorizontal: space[4],
                paddingTop: space[4],
                paddingBottom: space[4],
                borderRadius: radius.small,
                borderWidth: border.input,
                borderColor: focused ? colors.text : colors.line,
                backgroundColor: colors.surface,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: type.body.fontSize,
                textAlignVertical: 'top',
                opacity: paused ? opacity.disabled : 1,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => void send()}
              style={({ pressed }) => ({
                width: size.input,
                height: size.input,
                borderRadius: radius.pill,
                backgroundColor: canSend ? colors.text : colors.raised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <ArrowUp size={size.icon} color={canSend ? colors.bg : colors.disabled} strokeWidth={size.iconStroke} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
