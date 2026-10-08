import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { RadioRow } from '../components/Choice';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { WEB_URL } from '../config';
import type { RoomRequest } from '../rooms/api';
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
  door: 'talk' | 'play';
  onBack: () => void;
  onStart: (request: RoomRequest) => void;
};

// Start something (docs/design/pages/start-something.md, docs/screens/17). For the open test: Talk or Play,
// starting now. Weekly groups, Learn and hosted rooms come later.
export function StartScreen({ door, onBack, onStart }: Props) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<Topic | null>(null);
  const [capacity, setCapacity] = useState<number>(6);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const talk = door === 'talk';
  // Invite-only rooms are opened by a link, and links need the web version to be online.
  const canInvite = !!WEB_URL;

  const start = () => {
    const problem = titleProblem(title);
    if (problem) {
      setError(TITLE_PROBLEM_TEXT[problem]);
      return;
    }
    onStart({
      kind: 'create',
      door,
      title: title.replace(/\s+/g, ' ').trim(),
      topic: talk ? topic : null,
      capacity,
      private: inviteOnly && canInvite,
    });
  };

  return (
    <AuthLayout
      title={talk ? 'Start a talk room' : 'Start a game room'}
      body={
        talk
          ? 'Pick a name people will want to join. It opens now, with you in it.'
          : 'Play Ludo or Find the Impostor with people you invite, or anyone. It opens now, with you in it.'
      }
      onBack={onBack}
      footer={
        <>
          <Button label="Start the room" variant="primary" onPress={start} />
          <Text variant="meta" color="textMeta" center>
            Rooms start when three people are here. The room rules apply.
          </Text>
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

      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">How many people?</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space[2] }}>
          {ROOM_SIZES.map((n) => (
            <Pill key={n} label={`Up to ${n}`} selected={capacity === n} onPress={() => setCapacity(n)} />
          ))}
        </View>
      </View>

      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">Who can join?</Text>
        <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
          <RadioRow
            title="Anyone"
            line={talk ? 'Listed under "I want to talk" for anyone to join.' : 'Listed under "Let\'s play" for anyone to join.'}
            selected={!inviteOnly}
            onPress={() => setInviteOnly(false)}
          />
          <RadioRow
            title="Invite only"
            line={
              canInvite
                ? 'Not listed. Only people you send the link to can join.'
                : 'Comes once the web version of Circles is online, so links work.'
            }
            selected={inviteOnly && canInvite}
            disabled={!canInvite}
            onPress={() => setInviteOnly(true)}
          />
        </View>
      </View>
    </AuthLayout>
  );
}
