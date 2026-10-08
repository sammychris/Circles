import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import {
  ANSWER_MAX,
  NOTE_MAX,
  QUESTION_MAX,
  TOPIC_MAX,
  TURN_MINUTES,
  VIDEO_TITLE_MAX,
  cleanNote,
  oneLine,
  parseVideoLink,
  type VideoRef,
} from '../../table/model';
import { border, fonts, opacity, radius, rules, size, space, type, useColors } from '../../theme';
import { Button } from '../Button';
import { ErrorLine } from '../ErrorLine';
import { Sheet } from '../Sheet';
import { Text } from '../Text';
import { TextField } from '../TextField';

// One choice in a row of pills. Selected: 2 px warm-white border and a check, never colour alone.
function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.minTarget,
        minWidth: size.minTarget,
        alignSelf: 'flex-start',
        paddingHorizontal: space[4],
        borderRadius: radius.pill,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        backgroundColor: selected ? colors.raised : colors.bg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      {selected ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : null}
      <Text variant="metaStrong" style={selected ? { fontFamily: fonts.extraBold } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

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

// Take turns: an optional topic and how long each turn is.
export function TurnsSheet({
  visible,
  onClose,
  onPut,
}: {
  visible: boolean;
  onClose: () => void;
  onPut: (topic: string, minutes: number) => void;
}) {
  const [topic, setTopic] = useState('');
  const [minutes, setMinutes] = useState<number>(2);
  useEffect(() => {
    if (visible) {
      setTopic('');
      setMinutes(2);
    }
  }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space[2] }}>
        <Text variant="title" accessibilityRole="header">
          Take turns
        </Text>
        <Text variant="body" color="textSoft">
          Everyone gets a turn to speak, one after another. You go first. Anyone can pass.
        </Text>
      </View>
      <TextField
        label="What about? (optional)"
        placeholder="Your best Lagos traffic story"
        value={topic}
        onChangeText={setTopic}
        maxLength={TOPIC_MAX}
      />
      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">Each turn</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {TURN_MINUTES.map((m) => (
            <Pill key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </View>
      </View>
      <Button label="Start taking turns" variant="primary" onPress={() => onPut(oneLine(topic, TOPIC_MAX), minutes)} />
    </Sheet>
  );
}

// Quiz: a question with 2 to 4 answers, and the right one if there is one (otherwise it's a poll).
export function QuizSheet({
  visible,
  onClose,
  onPut,
}: {
  visible: boolean;
  onClose: () => void;
  onPut: (question: string, answers: string[], correct: number | null) => void;
}) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState(['', '']);
  const [correct, setCorrect] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setQuestion('');
      setAnswers(['', '']);
      setCorrect(null);
      setError(null);
    }
  }, [visible]);

  const put = () => {
    const q = oneLine(question, QUESTION_MAX);
    const list = answers.map((a) => oneLine(a, ANSWER_MAX));
    const filled = list.filter(Boolean);
    if (!q || filled.length < 2) {
      setError('Write a question and at least two answers.');
      return;
    }
    const right = correct !== null && list[correct] ? filled.indexOf(list[correct]) : null;
    onPut(q, filled, right);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView style={{ maxHeight: size.sheetList * 1.6 }} contentContainerStyle={{ gap: space[4] }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space[2] }}>
          <Text variant="title" accessibilityRole="header">
            Quiz
          </Text>
          <Text variant="body" color="textSoft">
            Everyone answers on their own phone. Nobody sees who chose what, and no scores are kept.
          </Text>
        </View>
        <TextField label="Question" placeholder="Which city has the best jollof?" value={question} onChangeText={setQuestion} maxLength={QUESTION_MAX} />
        {answers.map((a, i) => (
          <View key={i} style={{ gap: space[2] }}>
            <TextField
              label={`Answer ${String.fromCharCode(65 + i)}`}
              value={a}
              onChangeText={(t) => setAnswers((list) => list.map((x, j) => (j === i ? t : x)))}
              maxLength={ANSWER_MAX}
            />
            <Pill label={correct === i ? 'Right answer' : 'Mark as right answer'} selected={correct === i} onPress={() => setCorrect(correct === i ? null : i)} />
          </View>
        ))}
        {answers.length < 4 ? (
          <Button label="Add an answer" variant="quiet" onPress={() => setAnswers((list) => [...list, ''])} />
        ) : null}
        <Text variant="meta" color="textMeta">
          No right answer marked? Then it's a poll.
        </Text>
        {error ? <ErrorLine message={error} /> : null}
      </ScrollView>
      <Button label="Ask the room" variant="primary" onPress={put} />
    </Sheet>
  );
}
