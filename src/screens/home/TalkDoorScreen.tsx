import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button } from '../../components/Button';
import { ShowSome } from '../../components/ShowSome';
import { DoorLayout } from '../../components/DoorLayout';
import { FilterChip } from '../../components/FilterChip';
import { RoomRulesSheet } from '../../components/RoomRulesSheet';
import { RoomRow } from '../../components/RoomRow';
import { Text } from '../../components/Text';
import { listOpenRooms, type Mood, type OpenRoom, type RoomRequest } from '../../rooms/api';
import { MOOD_STYLE } from '../../rooms/moods';
import { radius, size, space, useColors } from '../../theme';

const MOODS: Mood[] = ['chat', 'laugh', 'advice'];

type Props = { nickname: string; onBack: () => void; onEnter: (request: RoomRequest) => void; onStart: () => void };

// Talk: meet new people on voice (Sammy's talk-page spec, 2026-10-11). Mood chips with Any by default
// filter the open rooms and set what Find a room looks for; Create a room is the secondary way in.
export function TalkDoorScreen({ nickname, onBack, onEnter, onStart }: Props) {
  const colors = useColors();
  const [mood, setMood] = useState<Mood | null>(null);
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setRooms(await listOpenRooms('talk'));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);

  // Only rooms with a free seat, for the chosen mood; fullest first, so people meet people.
  const shown = (rooms ?? [])
    .filter((r) => r.here < r.capacity && (mood === null || r.mood === mood))
    .sort((x, y) => y.here - x.here);
  // Nothing to join: the button says what will really happen.
  const starting = rooms !== null && shown.length === 0;
  const moodLabel = mood ? MOOD_STYLE[mood].label.toLowerCase() : null;

  return (
    <DoorLayout
      title="Talk"
      line="Meet new people on voice."
      onBack={onBack}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      footer={
        <>
          <Button label={starting ? 'Start a room' : 'Find a room'} variant="primary" onPress={() => onEnter({ kind: 'match', door: 'talk', mood })} />
          {starting ? (
            <Text variant="meta" color="textMeta" center>
              {moodLabel ? `Others who want to ${moodLabel} will join you.` : 'Others looking to talk will join you.'}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: space[1] }}>
            <Text variant="meta" color="textMeta">{`Joining as ${nickname} · mic off ·`}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRulesOpen(true)} hitSlop={space[3]} style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
              <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
                Room rules
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel="Mood"
        contentContainerStyle={{ gap: space[2] }}
      >
        <FilterChip label="Any" selected={mood === null} onPress={() => setMood(null)} />
        {MOODS.map((m) => (
          <FilterChip
            key={m}
            label={MOOD_STYLE[m].label}
            Icon={MOOD_STYLE[m].Icon}
            iconColor={MOOD_STYLE[m].fg}
            selected={mood === m}
            // Tapping the chosen one again goes back to Any.
            onPress={() => setMood(mood === m ? null : m)}
          />
        ))}
      </ScrollView>

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Open now</Text>
        {rooms === null && !failed ? (
          <View accessible accessibilityLabel="Loading rooms" style={{ gap: space[3] }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ height: size.avatarList, borderRadius: radius.small, backgroundColor: colors.raised }} />
            ))}
          </View>
        ) : null}
        {failed && rooms === null ? (
          <View style={{ gap: space[1] }}>
            <Text variant="body" color="textSoft">
              {"Couldn't load rooms."}
            </Text>
            <Button label="Try again" variant="quiet" onPress={() => void load()} />
          </View>
        ) : null}
        {starting ? (
          <Text variant="body" color="textSoft">
            {moodLabel && (rooms ?? []).length > 0 ? `No “${MOOD_STYLE[mood!].label}” rooms open right now.` : 'No rooms open right now.'}
          </Text>
        ) : null}
        <ShowSome items={shown} noun="open rooms" render={(room) => (
          <RoomRow key={room.id} room={room} onJoin={() => onEnter({ kind: 'join', roomId: room.id })} />
        )} />
      </View>

      <View style={{ gap: space[2] }}>
        <Button label="Create a room" variant="secondary" onPress={onStart} />
        <Text variant="meta" color="textMeta" center>
          Pick a topic, invite friends
        </Text>
      </View>
      <RoomRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </DoorLayout>
  );
}
