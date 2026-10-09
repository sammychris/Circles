import { View } from 'react-native';
import { LANGUAGES, LEVELS, SKILLS, levelQuestion, type LearnLevel, type LearnSubject } from '../rooms/learn';
import { space } from '../theme';
import { RadioRow } from './Choice';
import { Sheet } from './Sheet';
import { Text } from './Text';

// "What would you like to practise?" for Practise now, when there's no language yet.
export function SubjectSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (s: LearnSubject) => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title" accessibilityRole="header">
        What would you like to practise?
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
        {[...LANGUAGES, ...SKILLS].map((s) => (
          <RadioRow key={s.id} title={s.name} line={s.greeting} selected={false} onPress={() => onPick(s)} />
        ))}
      </View>
    </Sheet>
  );
}

// "What's your Igbo like?" Beginner, Getting there, Fluent (learn.md › Practise now).
export function LevelSheet({
  subject,
  current,
  onClose,
  onPick,
}: {
  subject: LearnSubject | null;
  current: LearnLevel | null;
  onClose: () => void;
  onPick: (level: LearnLevel) => void;
}) {
  return (
    <Sheet visible={!!subject} onClose={onClose}>
      {subject ? (
        <>
          <View style={{ gap: space[2] }}>
            <Text variant="title" accessibilityRole="header">
              {levelQuestion(subject)}
            </Text>
            <Text variant="body" color="textSoft">
              We'll put you with people at the same level. You can change it any time.
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
            {LEVELS.map((l) => (
              <RadioRow key={l.id} title={l.label} selected={current === l.id} onPress={() => onPick(l.id)} />
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
