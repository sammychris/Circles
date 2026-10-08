import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { RoomRow } from '../../components/RoomRow';
import { Text } from '../../components/Text';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import { listOpenRoomsAt, type ListedRoom, type RoomRequest } from '../../rooms/api';
import { matchesFilter, sortLive, type Filter } from '../../rooms/explore';
import { TOPICS } from '../../rooms/start';
import { border, fonts, opacity, radius, size, space, useColors } from '../../theme';

// Explore: what's happening in Circles (docs/design/pages/tabs.md › Explore). Live now for the moment;
// Tonight and Every week come with scheduled rooms. Support rooms are never listed here: the support
// door on Home is their only way in (the room server never lists them).

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

type Props = { onEnter: (r: RoomRequest) => void; onStart: () => void };

export function ExploreScreen({ onEnter, onStart }: Props) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('explore');
  const [rooms, setRooms] = useState<ListedRoom[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [all, setAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setRooms(sortLive(await listOpenRoomsAt(['talk', 'play', 'learn'])));
      setFailed(false);
      setOffline(false);
    } catch {
      // Keep the last list if there is one, and say so.
      setRooms((last) => {
        if (last) setOffline(true);
        else setFailed(true);
        return last;
      });
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
              await load();
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
              <View style={{ width: space[2], height: space[2], borderRadius: radius.pill, backgroundColor: colors.live }} />
              <Text variant="meta" color="textSoft">
                {`${people} ${people === 1 ? 'person' : 'people'} in ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`}
              </Text>
            </View>
          ) : null}
          {offline ? (
            <Text variant="meta" color="textMeta">
              {"You're offline. This is the last list we had."}
            </Text>
          ) : null}

          {failed ? (
            <View style={{ gap: space[3] }}>
              <Text variant="body" color="textSoft">
                {"We couldn't load what's happening. Check that you're online."}
              </Text>
              <Button label="Try again" onPress={() => void load()} />
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
              <Button label="Start a room" onPress={onStart} />
              {filter !== 'all' ? <Button label="Show all rooms" variant="quiet" onPress={() => setFilter('all')} /> : null}
            </View>
          ) : (
            <View>
              {(all ? shown : shown.slice(0, SHOW)).map((r) => (
                <RoomRow
                  key={r.id}
                  room={r}
                  onJoin={() => onEnter({ kind: 'join', roomId: r.id, ...(r.door === 'learn' ? {} : { door: r.door }) })}
                />
              ))}
              {!all && shown.length > SHOW ? (
                <Button label={`See all ${shown.length}`} variant="quiet" onPress={() => setAll(true)} />
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
