import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { RoomRow } from '../../components/RoomRow';
import { GroupCard, LoadError, ScheduledRow, SkeletonRows } from '../../components/Scheduled';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import { listOpenRoomsAt, type ListedRoom, type RoomRequest } from '../../rooms/api';
import { matchesFilter, sortLive, type Filter } from '../../rooms/explore';
import { tonight, type Group, type ScheduledRoom } from '../../rooms/schedule';
import { useSchedule } from '../../rooms/useSchedule';
import { TOPICS } from '../../rooms/start';
import { border, fonts, opacity, radius, size, space, useColors } from '../../theme';

// Explore: what's happening in Circles (docs/design/pages/tabs.md › Explore): Live now, Tonight and
// Every week. Support rooms are never listed here: the support door on Home is their only way in (the
// room server never lists them, and they can never be scheduled).

const DOOR_FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'talk', label: 'Talk' },
  { id: 'play', label: 'Play' },
  { id: 'learn', label: 'Learn' },
];
const FILTERS = [...DOOR_FILTERS, ...TOPICS.map((t) => ({ id: `topic:${t.id}`, label: t.label }))];
const SHOW = 5;

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.minTarget,
        paddingHorizontal: space[4],
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.raised : colors.surface,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      {/* Never colour alone: the selected chip also has a check. */}
      {selected ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : null}
      <Text variant="metaStrong" style={selected ? { fontFamily: fonts.extraBold } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

// onStart: Start something behind the door being looked at (Talk for All and topics); `later` opens it
// set for a time.
type Props = {
  me: { id: string };
  onEnter: (r: RoomRequest) => void;
  onStart: (door: 'talk' | 'play' | 'learn', later?: boolean) => void;
  onOpenGroup: (group: Group) => void;
};

export function ExploreScreen({ me, onEnter, onStart, onOpenGroup }: Props) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('explore');
  const [rooms, setRooms] = useState<ListedRoom[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [all, setAll] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const loaded = useRef(false);
  const schedule = useSchedule(me.id, true);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRooms(sortLive(await listOpenRoomsAt(['talk', 'play', 'learn'])));
      loaded.current = true;
      setFailed(false);
      setOffline(false);
    } catch {
      // Keep the last list if there is one, and say so; joining waits for the connection.
      if (loaded.current) setOffline(true);
      else setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const shown = (rooms ?? []).filter((r) => matchesFilter(r, filter));
  const people = (rooms ?? []).reduce((n, r) => n + r.here, 0);
  const label = FILTERS.find((f) => f.id === filter)?.label ?? '';
  const soon = tonight(schedule.rooms ?? []).filter((r) => matchesFilter(r, filter));
  // Weekly groups: ones you're not in yet first (yours are on the Groups tab too).
  const weekly = (schedule.groups ?? [])
    .filter((g) => matchesFilter(g, filter))
    .sort((a, b) => Number(a.regular || a.mine) - Number(b.regular || b.mine) || b.regulars - a.regulars);
  const nextUp: ScheduledRoom | null = (schedule.rooms ?? []).find((r) => r.startsAt.getTime() > Date.now()) ?? null;
  const startDoor = filter === 'play' || filter === 'learn' ? filter : 'talk';
  const toggle = async (room: ScheduledRoom) => {
    setNote(await schedule.toggleReminder(room));
  };
  const goIn = (room: ScheduledRoom) => onEnter({ kind: 'scheduled', scheduledId: room.id });

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scroll}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: space[7] }}
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
        <View style={{ paddingHorizontal: space.gutter, paddingTop: space[4], gap: space[1] }}>
          <Text variant="title" accessibilityRole="header">
            Explore
          </Text>
          <Text variant="body" color="textSoft">
            {"What's happening in Circles"}
          </Text>
        </View>

        <View style={{ backgroundColor: colors.bg, paddingVertical: space[3] }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="radiogroup"
            accessibilityLabel="Filter rooms"
            contentContainerStyle={{ paddingHorizontal: space.gutter, gap: space[2] }}
          >
            {FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                label={f.label}
                selected={filter === f.id}
                onPress={() => {
                  setFilter(f.id);
                  setAll(false);
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: space.gutter, gap: space[3] }}>
          <Text variant="heading" accessibilityRole="header">
            Live now
          </Text>
          {rooms && rooms.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <View style={{ width: size.newDot, height: size.newDot, borderRadius: radius.pill, backgroundColor: colors.live }} />
              <Text variant="meta" color="textSoft">
                {`${people} ${people === 1 ? 'person' : 'people'} in ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`}
              </Text>
            </View>
          ) : null}
          {offline ? (
            <Text variant="meta" color="textMeta">
              {"You're offline. Rooms need a connection."}
            </Text>
          ) : null}

          {failed ? (
            <View style={{ gap: space[3] }}>
              <Text variant="body" color="textSoft">
                {"We couldn't load what's happening. Check that you're online."}
              </Text>
              <Button
                label="Try again"
                loading={retrying}
                onPress={async () => {
                  setRetrying(true);
                  await load();
                  setRetrying(false);
                }}
              />
            </View>
          ) : rooms === null ? (
            // Loading: rows in the shape of the content.
            <View style={{ gap: space[3] }} accessibilityLabel="Loading rooms">
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] }}>
                  <View
                    style={{ width: size.avatarList, height: size.avatarList, borderRadius: radius.pill, backgroundColor: colors.raised }}
                  />
                  <View style={{ flex: 1, gap: space[2] }}>
                    <View style={{ height: space[4], width: '60%', borderRadius: radius.small, backgroundColor: colors.raised }} />
                    <View style={{ height: space[3], width: '35%', borderRadius: radius.small, backgroundColor: colors.raised }} />
                  </View>
                </View>
              ))}
            </View>
          ) : shown.length === 0 ? (
            <View style={{ gap: space[3] }}>
              <Text variant="body" color="textSoft">
                {filter === 'all' ? "It's quiet right now. Start a room and people can join you." : `No ${label} rooms are open right now.`}
              </Text>
              {/* Only when Tonight below doesn't already show it. */}
              {nextUp && filter === 'all' && !soon.some((r) => r.id === nextUp.id) ? (
                <View>
                  <Text variant="metaStrong" color="textSoft">
                    Next up
                  </Text>
                  <ScheduledRow room={nextUp} onToggle={() => void toggle(nextUp)} onGoIn={() => goIn(nextUp)} />
                </View>
              ) : null}
              <Button label="Start a room" onPress={() => onStart(startDoor)} />
              {filter !== 'all' ? <Button label="Show all rooms" variant="quiet" onPress={() => setFilter('all')} /> : null}
            </View>
          ) : (
            <View>
              {(all ? shown : shown.slice(0, SHOW)).map((r) => (
                <RoomRow
                  key={r.id}
                  room={r}
                  disabled={offline}
                  onJoin={() => onEnter({ kind: 'join', roomId: r.id, ...(r.door === 'learn' ? {} : { door: r.door }) })}
                />
              ))}
              {!all && shown.length > SHOW ? (
                <Button label={`See all ${shown.length}`} variant="quiet" onPress={() => setAll(true)} />
              ) : null}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: space.gutter, paddingTop: space[6], gap: space[3] }}>
          <Text variant="heading" accessibilityRole="header">
            Tonight
          </Text>
          {schedule.failed && !schedule.rooms ? (
            <LoadError what="what's coming up" onRetry={() => void schedule.load()} />
          ) : schedule.rooms === null ? (
            <SkeletonRows />
          ) : soon.length === 0 ? (
            <View style={{ gap: space[3] }}>
              <Text variant="body" color="textSoft">
                Nothing scheduled tonight. Start one and people can set a reminder.
              </Text>
              <Button label="Schedule a room" onPress={() => onStart(startDoor, true)} />
            </View>
          ) : (
            <View>
              {soon.map((r) => (
                <ScheduledRow key={r.id} room={r} disabled={offline} onToggle={() => void toggle(r)} onGoIn={() => goIn(r)} />
              ))}
              <Button label="Schedule a room" variant="quiet" onPress={() => onStart(startDoor, true)} />
            </View>
          )}
        </View>

        {weekly.length > 0 ? (
          <View style={{ paddingHorizontal: space.gutter, paddingTop: space[6], gap: space[3] }}>
            <Text variant="heading" accessibilityRole="header">
              Every week
            </Text>
            {weekly.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => onOpenGroup(g)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: space[4] }} pointerEvents="none">
        <Toast message={note} onDone={() => setNote(null)} />
      </View>
    </SafeAreaView>
  );
}
