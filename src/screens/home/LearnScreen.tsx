import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '../../components/Button';
import { FilterChip } from '../../components/FilterChip';
import { DoorLayout } from '../../components/DoorLayout';
import { LevelSheet, SubjectSheet } from '../../components/LearnSheets';
import { Text } from '../../components/Text';
import { loadLearn, saveLevel } from '../../lib/learnLevels';
import { listOpenRooms, type OpenRoom, type RoomRequest } from '../../rooms/api';
import { FORMATS, LEARN_GROUPS, SOON, SUBJECTS, learnGroup, levelLabel, subjectById, type LearnGroup, type LearnLevel, type LearnSubject } from '../../rooms/learn';
import { motion, opacity, radius, size, space, useColors } from '../../theme';

const countFor = (rooms: OpenRoom[] | null, subject: string) => (rooms ?? []).filter((r) => r.language === subject).length;

// Only when a group is open: a "Be the first" on every card told newcomers nobody was here.
function openNow(rooms: OpenRoom[] | null, subject: string): string | null {
  const n = countFor(rooms, subject);
  return n === 0 ? null : n === 1 ? '1 group open now' : `${n} groups open now`;
}

// One card style for languages and skills. A language shows how to say hello in it.
function SubjectCard({ subject, open, onPress }: { subject: LearnSubject; open: string | null; onPress: () => void }) {
  const colors = useColors();
  const sub = subject.greeting ? `“${subject.greeting}!” 👋` : subject.short;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[subject.name, subject.greeting ? `${subject.greeting} means hello` : subject.short, open].filter(Boolean).join('. ')}
      onPress={onPress}
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
      <Text variant="heading">{subject.name}</Text>
      <Text variant="body" color="textSoft">
        {sub}
      </Text>
      {open ? (
        <Text variant="meta" color="live">
          {open}
        </Text>
      ) : null}
    </Pressable>
  );
}

// Greyed out: there's no room for it yet (SOON in rooms/learn.ts).
function SoonCard({ name }: { name: string }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${name}. Coming soon`}
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        minHeight: size.rowAction,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: space[4],
        gap: space[1],
        opacity: opacity.disabled,
      }}
    >
      <Text variant="heading">{name}</Text>
      <Text variant="body" color="textSoft">
        Coming soon
      </Text>
    </View>
  );
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
  // null while loading.
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Busiest first (learn.md), worked out once when the list first arrives, so tiles don't move under
  // your thumb while you look.
  const [order, setOrder] = useState(SUBJECTS);
  const [group, setGroup] = useState<LearnGroup>('nigerian');
  const sorted = useRef(false);
  const [levels, setLevels] = useState<Record<string, LearnLevel>>({});
  const [last, setLast] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [asking, setAsking] = useState<LearnSubject | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await listOpenRooms('learn');
      if (!sorted.current) {
        sorted.current = true;
        setOrder([...SUBJECTS].sort((a, b) => countFor(list, b.id) - countFor(list, a.id)));
      }
      setRooms(list);
      setFailed(false);
    } catch {
      // The list is extra: Practise now still works.
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
    void loadLearn().then((s) => {
      setLevels(s.levels);
      setLast(s.last);
      const lastSubject = subjectById(s.last);
      if (lastSubject) setGroup(learnGroup(lastSubject));
    });
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);

  const practise = (subject: LearnSubject, level: LearnLevel) => {
    void saveLevel(subject.id, level);
    onEnter({ kind: 'match', door: 'learn', mood: null, language: subject.id, level });
  };
  const lastSubject = subjectById(last);
  const lastLevel = lastSubject ? levelLabel(levels[lastSubject.id]) : null;
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
            label={lastSubject && lastLevel ? `Practise ${lastSubject.name} again` : 'Pick what to practise'}
            variant="primary"
            onPress={practiseNow}
          />
          <Text variant="meta" color="textMeta" center>
            {lastSubject && lastLevel
              ? `Last time: ${lastSubject.name}, ${lastLevel}. Tap a card to change.`
              : "We'll ask your level, then match you"}
          </Text>
        </>
      }
    >
      {failed && rooms === null ? (
        <View style={{ gap: space[1] }}>
          <Text variant="body" color="textSoft">
            {"We couldn't check which groups are open. Check that you're online. Practise now still works."}
          </Text>
          <Button label="Try again" variant="quiet" onPress={() => void load()} />
        </View>
      ) : null}
      <View style={{ gap: space[2] }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="How to learn" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {FORMATS.map((f) => (
            <FilterChip key={f.id} label={f.ready ? f.label : `${f.label} · Soon`} selected={f.ready} disabled={!f.ready} onPress={() => {}} />
          ))}
        </View>
        <Text variant="meta" color="textMeta">
          Quiz, Challenge and Debate rooms are coming soon. For now, every room is for practising.
        </Text>
      </View>

      <View style={{ gap: space[3] }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="What to learn" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {LEARN_GROUPS.map((g) => (
            <FilterChip key={g.id} label={g.label} selected={group === g.id} onPress={() => setGroup(g.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {order
            .filter((s) => learnGroup(s) === group)
            .map((s) => (
              <SubjectCard key={s.id} subject={s} open={openNow(rooms, s.id)} onPress={() => onOpenSubject(s.id)} />
            ))}
          {SOON[group].map((name) => (
            <SoonCard key={name} name={name} />
          ))}
        </View>
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
