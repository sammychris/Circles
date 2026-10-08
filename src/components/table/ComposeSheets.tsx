import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { NOTE_MAX, VIDEO_TITLE_MAX, cleanNote, parseVideoLink, type VideoRef } from '../../table/model';
import { border, fonts, radius, rules, size, space, type, useColors } from '../../theme';
import { Button } from '../Button';
import { ErrorLine } from '../ErrorLine';
import { Sheet } from '../Sheet';
import { Text } from '../Text';
import { TextField } from '../TextField';

// A note or link for the table: up to 500 characters. Links show as their site name only.
export function NoteSheet({ visible, onClose, onPut }: { visible: boolean; onClose: () => void; onPut: (text: string) => void }) {
  const colors = useColors();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setText('');
      setError(null);
    }
  }, [visible]);

  const put = () => {
    const clean = cleanNote(text);
    if (!clean) {
      setError('Write something first.');
      return;
    }
    onPut(clean);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title" accessibilityRole="header">
        A note or link
      </Text>
      <View style={{ gap: space[2] }}>
        <Text variant="bodyStrong" accessibilityElementsHidden importantForAccessibility="no">
          What do you want to put on the table?
        </Text>
        <TextInput
          accessibilityLabel="What do you want to put on the table?"
          value={text}
          onChangeText={(t) => {
            setText(t);
            if (error) setError(null);
          }}
          multiline
          maxLength={NOTE_MAX}
          placeholder="A question, a thought, or a link to talk about"
          placeholderTextColor={colors.textMeta}
          selectionColor={colors.ember}
          maxFontSizeMultiplier={rules.maxTextScale}
          style={{
            minHeight: size.input * 2,
            maxHeight: size.sheetList,
            padding: space[4],
            borderRadius: radius.small,
            borderWidth: border.input,
            borderColor: error ? colors.danger : colors.line,
            backgroundColor: colors.bg,
            color: colors.text,
            fontFamily: fonts.regular,
            fontSize: type.body.fontSize,
            textAlignVertical: 'top',
          }}
        />
        {error ? (
          <ErrorLine message={error} />
        ) : (
          <Text variant="meta" color="textMeta">
            {`Everyone in the room sees it. Up to ${NOTE_MAX} characters.`}
          </Text>
        )}
      </View>
      <Button label="Put it on the table" variant="primary" onPress={put} />
    </Sheet>
  );
}

// Watch together: a YouTube or Vimeo link, shown in their own player (nothing is copied or stored).
export function VideoSheet({
  visible,
  onClose,
  onPut,
}: {
  visible: boolean;
  onClose: () => void;
  onPut: (video: VideoRef, title: string) => void;
}) {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setLink('');
      setTitle('');
      setError(null);
    }
  }, [visible]);

  const put = () => {
    const video = parseVideoLink(link);
    if (!video) {
      setError('Paste a YouTube or Vimeo link. Other sites aren’t allowed yet.');
      return;
    }
    onPut(video, cleanNote(title).replace(/\n/g, ' ').slice(0, VIDEO_TITLE_MAX));
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space[2] }}>
        <Text variant="title" accessibilityRole="header">
          Watch together
        </Text>
        <Text variant="body" color="textSoft">
          You play and pause for everyone. Each person can look back on their own, then catch up.
        </Text>
      </View>
      <TextField
        label="YouTube or Vimeo link"
        placeholder="https://youtu.be/…"
        value={link}
        onChangeText={(t) => {
          setLink(t);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={error}
      />
      <TextField
        label="What is it? (optional)"
        placeholder="A Nollywood classic, my AI short film…"
        value={title}
        onChangeText={setTitle}
        maxLength={VIDEO_TITLE_MAX}
      />
      <Button label="Put it on the table" variant="primary" onPress={put} />
    </Sheet>
  );
}
