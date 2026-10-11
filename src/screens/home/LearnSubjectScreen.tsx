import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { LevelSheet } from '../../components/LearnSheets';
import { RoomRow } from '../../components/RoomRow';
import { Text } from '../../components/Text';
import { loadLearn, saveLevel } from '../../lib/learnLevels';
import { listOpenRooms, type OpenRoom, type RoomRequest } from '../../rooms/api';
import { LEARN_CAPACITY, levelLabel, subjectById, type LearnLevel } from '../../rooms/learn';
import { radius, size, space, useColors } from '../../theme';

// A language or skill page (docs/screens/15-igbo.png, learn.md). Practice groups open now; classes with
// teachers don't exist yet and are only mentioned as coming soon.
export function LearnSubjectScreen({
  subjectId,
  onBack,
  onEnter,
  onStart,
}: {
  subjectId: string;
  onBack: () => void;
  onEnter: (r: RoomRequest) => void;
  onStart: () => void;
}) {
  const colors = useColors();
  const subject = subjectById(subjectId);
  const [level, setLevel] = useState<LearnLevel | null>(null);
  const [asking, setAsking] = useState(false);
  // Practise now waits for a level the first time.
  const [goAfterLevel, setGoAfterLevel] = useState(false);
  // null while loading.
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setRooms((await listOpenRooms('learn')).filter((r) => r.language === subjectId));
      setFailed(false);
    } catch {
      // The list is extra: Practise now still works.
      setFailed(true);
    }
  }, [subjectId]);
  useEffect(() => {
    void load();
    void loadLearn().then((s) => setLevel(s.levels[subjectId] ?? null));
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load, subjectId]);

  if (!subject) {
    return (
      <DoorLayout title="Learn together" onBack={onBack} backLabel="Back to Learn together">
        <Text variant="body" color="textSoft">
          {"We couldn't find this subject. Go back and pick another."}
        </Text>
      </DoorLayout>
    );
  }
  const practise = (lvl: LearnLevel) => {
    void saveLevel(subject.id, lvl);
    onEnter({ kind: 'match', door: 'learn', mood: null, language: subject.id, level: lvl });
  };
  // Your level first, then the others.
  const sorted = [...(rooms ?? [])].sort((a, b) => Number(b.level === level) - Number(a.level === level) || b.here - a.here);

  return (
    <DoorLayout
      title={subject.name}
      line={subject.line}
      onBack={onBack}
      backLabel="Back to Learn together"
      footer={
        <>
          <Button
            label={`Practise ${subject.kind === 'language' ? subject.name : 'now'}${subject.kind === 'language' ? ' now' : ''}`}
            variant="primary"
            onPress={() => {
              if (level) practise(level);
              else {
                setGoAfterLevel(true);
                setAsking(true);
              }
            }}
          />
          <Text variant="meta" color="textMeta" center>
            {"Voice chat. If nobody's in yet, you wait in the room until someone joins."}
          </Text>
        </>
      }
    >
      {/* Your level before you're matched, never assumed. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
        <Text variant="body" color="textSoft">
          {level ? `Your level: ${levelLabel(level)} ·` : 'Your level: not set yet ·'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={level ? 'Change your level' : 'Choose your level'}
          onPress={() => setAsking(true)}
          hitSlop={space[3]}
          style={{ minHeight: size.minTarget, justifyContent: 'center' }}
        >
          <Text variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
            {level ? 'Change' : 'Choose'}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Practice groups</Text>
        <Text variant="body" color="textSoft">
          {`Free voice chat · up to ${LEARN_CAPACITY} people, everyone talks.`}
        </Text>
        {rooms === null && !failed ? (
          <View accessible accessibilityLabel="Loading groups" style={{ gap: space[3] }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ height: size.avatarList, borderRadius: radius.small, backgroundColor: colors.raised }} />
            ))}
          </View>
        ) : rooms === null ? (
          <View style={{ gap: space[1] }}>
            <Text variant="body" color="textSoft">
              {"We couldn't load the groups. Check that you're online. Practise now still works."}
            </Text>
            <Button label="Try again" variant="quiet" onPress={() => void load()} />
          </View>
        ) : sorted.length === 0 ? (
          <Text variant="body" color="textSoft">
            No groups open yet. Start one and others at your level will join.
          </Text>
        ) : (
          sorted.map((room) => <RoomRow key={room.id} room={room} onJoin={() => onEnter({ kind: 'join', roomId: room.id })} />)
        )}
      </View>
      {/* Not the same as Practise now: you name the group and pick when it happens (Start screen). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Host your own group. Pick its name and time, now or later."
        onPress={onStart}
        style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[3] }}
      >
        <Plus size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Host your own group</Text>
          <Text variant="meta" color="textSoft">
            Pick its name and time, now or later
          </Text>
        </View>
      </Pressable>
      <Text variant="meta" color="textMeta">
        Classes with teachers are coming soon.
      </Text>

      <LevelSheet
        subject={asking ? subject : null}
        current={level}
        onClose={() => {
          setAsking(false);
          setGoAfterLevel(false);
        }}
        onPick={(lvl) => {
          setAsking(false);
          setLevel(lvl);
          void saveLevel(subject.id, lvl);
          if (goAfterLevel) {
            setGoAfterLevel(false);
            practise(lvl);
          }
        }}
      />
    </DoorLayout>
  );
}
