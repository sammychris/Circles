import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { RadioRow } from '../components/Choice';
import { RoomRulesSheet } from '../components/RoomRulesSheet';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { WEB_URL } from '../config';
import type { RoomRequest } from '../rooms/api';
import { LEARN_CAPACITY, LEVELS, subjectById, type LearnLevel } from '../rooms/learn';
import { ROOM_SIZES, TITLE_MAX, TITLE_PROBLEM_TEXT, TOPICS, titleProblem, type Topic } from '../rooms/start';
import { border, fonts, opacity, radius, size, space, useColors } from '../theme';

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
        paddingHorizontal: space[4],
        borderRadius: radius.pill,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        backgroundColor: selected ? colors.raised : colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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

type Props = {
  door: 'talk' | 'play' | 'learn';
  // Learn rooms: the language or skill (learn.md › "Start an Igbo practice group").
  subject?: string;
  // What they typed before, when a room didn't start and they came back to change it.
  draft?: Extract<RoomRequest, { kind: 'create' }>;
  onBack: () => void;
  onStart: (request: RoomRequest) => void;
};

// Start something (docs/design/pages/start-something.md, docs/screens/17). For the open test: Talk or Play,
// starting now. Weekly groups, Learn and hosted rooms come later.
export function StartScreen({ door, subject, draft, onBack, onStart }: Props) {
  const learnSubject = door === 'learn' ? subjectById(draft?.language ?? subject) : null;
  const [title, setTitle] = useState(draft?.title ?? (learnSubject ? `${learnSubject.name} practice` : ''));
  const [level, setLevel] = useState<LearnLevel | null>(draft?.level ?? null);
  const [levelError, setLevelError] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic | null>(draft?.topic ?? null);
  const [capacity, setCapacity] = useState<number>(draft?.capacity ?? (door === 'learn' ? LEARN_CAPACITY : 6));
  const sizes: number[] = door === 'learn' ? [...ROOM_SIZES, LEARN_CAPACITY] : [...ROOM_SIZES];
  // Nobody is listed publicly without choosing it (design direction: nothing is chosen for people).
  const [inviteOnly, setInviteOnly] = useState<boolean | null>(draft ? draft.private : null);
  const [error, setError] = useState<string | null>(draft ? (titleProblem(draft.title) ? TITLE_PROBLEM_TEXT[titleProblem(draft.title)!] : null) : null);
  const [whoError, setWhoError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const talk = door === 'talk';
  // Invite-only rooms are opened by a link, and links need the web version to be online.
  const canInvite = !!WEB_URL;

  const start = () => {
    const problem = titleProblem(title);
    if (problem) setError(TITLE_PROBLEM_TEXT[problem]);
    if (inviteOnly === null) setWhoError('Choose who can join.');
    const needsLevel = door === 'learn' && !level;
    if (needsLevel) setLevelError('Choose a level.');
    if (problem || inviteOnly === null || needsLevel) return;
    onStart({
      kind: 'create',
      door,
      title: title.replace(/\s+/g, ' ').trim(),
      topic: talk ? topic : null,
      capacity,
      private: !!inviteOnly && canInvite,
      ...(door === 'learn' && learnSubject && level ? { language: learnSubject.id, level } : {}),
    });
  };

  return (
    <AuthLayout
      title={learnSubject ? `Start a ${learnSubject.name} practice group` : talk ? 'Start a talk room' : 'Start a game room'}
      body={
        learnSubject
          ? 'Practise out loud with people at your level. It opens now, with you in it.'
          : talk
            ? 'Pick a name people will want to join. It opens now, with you in it.'
            : 'Play Ludo or Find the Impostor with people you invite, or anyone. It opens now, with you in it.'
      }
      onBack={onBack}
      footer={
        <>
          <Button label="Start the room" variant="primary" onPress={start} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: space[1] }}>
            <Text variant="meta" color="textMeta">
              Rooms start when three people are here.
            </Text>
            <Pressable accessibilityRole="link" onPress={() => setRulesOpen(true)} hitSlop={space[3]}>
              <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
                Room rules
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      <TextField
        label="Name your room"
        placeholder={talk ? 'Arsenal fans, Owambe stories…' : 'Ludo with the guys'}
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          if (error) setError(null);
        }}
        maxLength={TITLE_MAX + 10}
        error={error}
        helper={`Up to ${TITLE_MAX} characters. Everyone in the room sees it.`}
        returnKeyType="done"
      />

      {talk ? (
        <View style={{ gap: space[3] }}>
          <Text variant="bodyStrong">What's it about? (optional)</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {TOPICS.map((t) => (
              <Pill key={t.id} label={t.label} selected={topic === t.id} onPress={() => setTopic(topic === t.id ? null : t.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {learnSubject ? (
        <View style={{ gap: space[3] }}>
          <Text variant="bodyStrong">Level</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {LEVELS.map((l) => (
              <Pill
                key={l.id}
                label={l.label}
                selected={level === l.id}
                onPress={() => {
                  setLevel(l.id);
                  setLevelError(null);
                }}
              />
            ))}
          </View>
          {levelError ? <ErrorLine message={levelError} /> : null}
        </View>
      ) : null}

      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">How many people?</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {sizes.map((n) => (
            <Pill key={n} label={`Up to ${n}`} selected={capacity === n} onPress={() => setCapacity(n)} />
          ))}
        </View>
      </View>

      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">Who can join?</Text>
        <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
          <RadioRow
            title="Anyone"
            line={
              learnSubject
                ? `Listed on the ${learnSubject.name} page for anyone to join.`
                : talk
                  ? 'Listed under "I want to talk" for anyone to join.'
                  : 'Listed under "Let\'s play" for anyone to join.'
            }
            selected={inviteOnly === false}
            onPress={() => {
              setInviteOnly(false);
              setWhoError(null);
            }}
          />
          <RadioRow
            title="Invite only"
            line={
              canInvite
                ? 'Not listed. Only people you send the link to can join.'
                : 'Comes once the web version of Circles is online, so links work.'
            }
            selected={inviteOnly === true && canInvite}
            disabled={!canInvite}
            onPress={() => {
              setInviteOnly(true);
              setWhoError(null);
            }}
          />
        </View>
        {whoError ? <ErrorLine message={whoError} /> : null}
      </View>
      <RoomRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </AuthLayout>
  );
}
