import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Code, Mic } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { LevelSheet, SubjectSheet } from '../../components/LearnSheets';
import { Text } from '../../components/Text';
import { loadLearn, saveLevel } from '../../lib/learnLevels';
import { listOpenRooms, type OpenRoom, type RoomRequest } from '../../rooms/api';
import { LANGUAGES, SKILLS, subjectById, type LearnLevel, type LearnSubject } from '../../rooms/learn';
import { motion, opacity, radius, size, space, useColors } from '../../theme';

function openNow(rooms: OpenRoom[], subject: string): string {
  const n = rooms.filter((r) => r.language === subject).length;
  return n === 0 ? 'Be the first' : n === 1 ? '1 group open now' : `${n} groups open now`;
}

// Learn together (docs/screens/14-learn-together.png, learn.md). Free practice groups by language or
// skill, matched by level. Paid classes come later.
export function LearnScreen({
  onBack,
  onEnter,
  onOpenSubject,
}: {
  onBack: () => void;
  onEnter: (r: RoomRequest) => void;
  onOpenSubject: (subject: string) => void;
}) {
  const colors = useColors();
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [levels, setLevels] = useState<Record<string, LearnLevel>>({});
  const [last, setLast] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [asking, setAsking] = useState<LearnSubject | null>(null);

  const load = useCallback(async () => {
    try {
      setRooms(await listOpenRooms('learn'));
    } catch {
      // The list is extra: Practise now still works.
    }
  }, []);
  useEffect(() => {
    void load();
    void loadLearn().then((s) => {
      setLevels(s.levels);
      setLast(s.last);
    });
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);

  const practise = (subject: LearnSubject, level: LearnLevel) => {
    void saveLevel(subject.id, level);
    onEnter({ kind: 'match', door: 'learn', mood: null, language: subject.id, level });
  };
  const practiseNow = () => {
    const subject = subjectById(last);
    if (subject && levels[subject.id]) practise(subject, levels[subject.id]);
    else setPicking(true);
  };

  return (
    <DoorLayout
      title="Learn together"
      line="Practise out loud with people at your level."
      onBack={onBack}
      footer={
        <>
          <Button
            label={subjectById(last) && levels[last ?? ''] ? `Practise ${subjectById(last)?.name} now` : 'Practise now'}
            variant="primary"
            onPress={practiseNow}
          />
          <Text variant="meta" color="textMeta" center>
            {"We'll match you by language and level"}
          </Text>
        </>
      }
    >
      <View style={{ gap: space[3] }}>
        <Text variant="heading">Languages</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={`${l.name}. ${openNow(rooms, l.id)}`}
              onPress={() => onOpenSubject(l.id)}
              style={({ pressed }) => ({
                flexBasis: '47%',
                flexGrow: 1,
                minHeight: size.rowAction,
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                padding: space[4],
                gap: space[1],
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <Text variant="heading">{l.name}</Text>
              <Text variant="body" color="textSoft">
                {l.greeting}
              </Text>
              <Text variant="meta" color="textMeta">
                {openNow(rooms, l.id)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Skills</Text>
        {SKILLS.map((s) => {
          const Icon = s.id === 'coding' ? Code : Mic;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}. ${openNow(rooms, s.id)}`}
              onPress={() => onOpenSubject(s.id)}
              style={({ pressed }) => ({ minHeight: size.avatarRoom, flexDirection: 'row', alignItems: 'center', gap: space[4], opacity: pressed ? opacity.pressed : 1 })}
            >
              <View style={{ width: size.avatarList, height: size.avatarList, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
              </View>
              <View style={{ flex: 1, gap: space[1] }}>
                <Text variant="bodyStrong">{s.name}</Text>
                <Text variant="meta" color="textSoft">
                  {openNow(rooms, s.id)}
                </Text>
              </View>
              <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            </Pressable>
          );
        })}
      </View>

      <SubjectSheet
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(s) => {
          setPicking(false);
          if (levels[s.id]) practise(s, levels[s.id]);
          else setTimeout(() => setAsking(s), motion.slow);
        }}
      />
      <LevelSheet
        subject={asking}
        current={null}
        onClose={() => setAsking(null)}
        onPick={(level) => {
          const s = asking;
          setAsking(null);
          if (s) practise(s, level);
        }}
      />
    </DoorLayout>
  );
}
