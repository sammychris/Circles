import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, ChevronRight, Dice5, Heart, MessageCircle, Users } from 'lucide-react-native';
import { RoomRow } from '../../components/RoomRow';
import { ScheduledRow } from '../../components/Scheduled';
import { Button } from '../../components/Button';
import { Glow } from '../../components/Glow';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { greeting, peopleInRooms, timeWord } from '../../lib/timeOfDay';
import { forYou, goBackRoom, loadVisits } from '../../lib/roomHistory';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import { listOpenRoomsAt, roomStats, type ListedRoom, type RoomRequest } from '../../rooms/api';
import { tonight } from '../../rooms/schedule';
import { useSchedule } from '../../rooms/useSchedule';
import { doorColors, opacity, radius, size, space, useColors } from '../../theme';

export type DoorName = 'support' | 'play' | 'talk' | 'learn' | 'people';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

function DoorTile({
  Icon,
  title,
  line,
  tint,
  onPress,
}: {
  Icon: Icon;
  title: string;
  line: string;
  tint: { fg: string; bg: string };
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: size.doorTile,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: space[4],
        justifyContent: 'space-between',
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <View
        style={{
          width: size.tileIconBox,
          height: size.tileIconBox,
          borderRadius: radius.small,
          backgroundColor: tint.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={size.iconButton20} color={tint.fg} strokeWidth={size.iconStroke} />
      </View>
      <View style={{ gap: space[1] }}>
        <Text variant="heading">{title}</Text>
        <Text variant="meta" color="textSoft" numberOfLines={1}>
          {line}
        </Text>
      </View>
    </Pressable>
  );
}

type Props = {
  me: { id: string; nickname: string };
  onOpen: (door: DoorName) => void;
  onEnter: (r: RoomRequest) => void;
  // Coming up › See all: Explore, where Tonight is.
  onExplore: () => void;
};

// Rows for "Go back in" and "For you": a room row with the reason as its line.
function Suggestion({
  room,
  reason,
  action,
  onEnter,
}: {
  room: ListedRoom;
  reason: string;
  action?: string;
  onEnter: (r: RoomRequest) => void;
}) {
  return (
    <RoomRow
      room={room}
      reason={reason}
      action={action}
      onJoin={() => onEnter({ kind: 'join', roomId: room.id, ...(room.door === 'learn' ? {} : { door: room.door }) })}
    />
  );
}

// One house, many doors (docs/screens/01-home.png). No ember on Home: each door page has its own.
export function HomeScreen({ me, onOpen, onEnter, onExplore }: Props) {
  const colors = useColors();
  const [people, setPeople] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const edges = useScreenEdges();
  const scroll = useTabScroll('home');
  // Go back in, and For you: from your own last rooms, kept on this phone (never support rooms).
  const [back, setBack] = useState<ListedRoom | null>(null);
  const [picks, setPicks] = useState<{ room: ListedRoom; reason: string }[]>([]);
  // Coming up: tonight's scheduled rooms (the same as Explore › Tonight, behind See all), yours first.
  const schedule = useSchedule(me.id);
  const [note, setNote] = useState<string | null>(null);
  const coming = tonight(schedule.rooms ?? [])
    .sort((a, b) => Number(b.reminded || b.regular || b.mine) - Number(a.reminded || a.regular || a.mine))
    .slice(0, 2)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const load = useCallback(async () => {
    try {
      setPeople((await roomStats()).people);
    } catch {
      setPeople(null);
    }
    try {
      const visits = await loadVisits(me.id);
      const doors = [...new Set(visits.map((v) => v.door))].filter((d): d is 'talk' | 'play' | 'learn' => d !== 'support');
      const open = doors.length > 0 ? await listOpenRoomsAt(doors) : [];
      const again = goBackRoom(visits, open);
      setBack(again);
      setPicks(forYou(visits, open, again?.id ?? null));
    } catch {
      // Suggestions are only a nice extra: nothing shows when they can't load.
    }
  }, [me.id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[4], paddingBottom: space[7], gap: space[6] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.textMeta}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([load(), schedule.load()]);
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Me is a tab now, so the avatar has left the top right. */}
        <View style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
          <Text variant="bodyStrong" color="textSoft" numberOfLines={1}>
            {`${greeting()}, ${me.nickname}`}
          </Text>
        </View>

        <View style={{ gap: space[3] }}>
          <Text variant="display" accessibilityRole="header">
            {`What brings you in ${timeWord()}?`}
          </Text>
          {people !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <View style={{ width: space[2], height: space[2], borderRadius: radius.pill, backgroundColor: colors.live }} />
              <Text variant="meta" color="textSoft">
                {peopleInRooms(people)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: space[3] }}>
          {/* The support line: always first under the question, never moved, hidden or shrunk. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Need someone to talk to? Come in. It's quiet and kind."
            onPress={() => onOpen('support')}
            style={({ pressed }) => ({
              minHeight: size.supportLine,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              paddingHorizontal: space[4],
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[4],
              overflow: 'hidden',
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <Glow diameter={size.supportLine * 4} centerX={space[4] + size.iconButton / 2} centerY={size.supportLine / 2} />
            <View
              style={{
                width: size.iconButton,
                height: size.iconButton,
                borderRadius: radius.pill,
                backgroundColor: colors.emberSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={size.iconButton20} color={colors.emberText} fill={colors.emberText} strokeWidth={size.iconStroke} />
            </View>
            <View style={{ flex: 1, gap: space[1] }}>
              <Text variant="bodyStrong">Need someone to talk to?</Text>
              <Text variant="meta" color="textSoft">
                Come in. It's quiet and kind.
              </Text>
            </View>
            <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          </Pressable>

          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <DoorTile Icon={Dice5} title="I'm bored" line="Play while you talk" tint={doorColors.play} onPress={() => onOpen('play')} />
            <DoorTile
              Icon={MessageCircle}
              title="I want to talk"
              line="Topics and moods"
              tint={doorColors.talk}
              onPress={() => onOpen('talk')}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <DoorTile
              Icon={BookOpen}
              title="Learn together"
              line="Languages, skills"
              tint={doorColors.learn}
              onPress={() => onOpen('learn')}
            />
            <DoorTile Icon={Users} title="My people" line="Friends and groups" tint={doorColors.people} onPress={() => onOpen('people')} />
          </View>
        </View>

        {back ? (
          <View style={{ gap: space[1] }}>
            <Text variant="heading" accessibilityRole="header">
              Go back in
            </Text>
            <Suggestion
              room={back}
              reason={`${back.here} ${back.here === 1 ? 'person' : 'people'} still here`}
              action="Go back in"
              onEnter={onEnter}
            />
          </View>
        ) : null}

        {picks.length > 0 ? (
          <View style={{ gap: space[1] }}>
            <Text variant="heading" accessibilityRole="header">
              For you
            </Text>
            {picks.map((p) => (
              <Suggestion key={p.room.id} room={p.room} reason={p.reason} onEnter={onEnter} />
            ))}
          </View>
        ) : null}

        {coming.length > 0 ? (
          <View style={{ gap: space[1] }}>
            <Text variant="heading" accessibilityRole="header">
              Coming up
            </Text>
            {coming.map((r) => (
              <ScheduledRow
                key={r.id}
                room={r}
                onToggle={() => void schedule.toggleReminder(r).then(setNote)}
                onGoIn={() => onEnter({ kind: 'scheduled', scheduledId: r.id })}
              />
            ))}
            <Button label="See all" variant="quiet" onPress={onExplore} />
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: space[4] }} pointerEvents="none">
        <Toast message={note} onDone={() => setNote(null)} />
      </View>
    </SafeAreaView>
  );
}
