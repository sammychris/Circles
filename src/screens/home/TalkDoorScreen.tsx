import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { RoomRulesSheet } from '../../components/RoomRulesSheet';
import { RoomRow } from '../../components/RoomRow';
import { Text } from '../../components/Text';
import { listOpenRooms, type Mood, type OpenRoom, type RoomRequest } from '../../rooms/api';
import { MOOD_STYLE } from '../../rooms/moods';
import { border, fonts, opacity, radius, size, space, useColors } from '../../theme';

const MOODS: Mood[] = ['chat', 'laugh', 'advice'];

function MoodTile({ mood, selected, onPress }: { mood: Mood; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  const style = MOOD_STYLE[mood];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={style.label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: size.moodTile,
        borderRadius: radius.card,
        padding: space[3],
        backgroundColor: selected ? colors.raised : colors.surface,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <style.Icon size={size.icon} color={style.fg} strokeWidth={size.iconStroke} />
      <Text variant="bodyStrong" center style={selected ? { fontFamily: fonts.extraBold } : undefined}>
        {style.label}
      </Text>
      {selected ? (
        <View
          style={{
            position: 'absolute',
            top: -space[2],
            right: -space[2],
            width: size.icon + space[2],
            height: size.icon + space[2],
            borderRadius: radius.pill,
            backgroundColor: colors.text,
            borderWidth: space[1],
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={size.iconMeta - space[1]} color={colors.bg} strokeWidth={size.iconStroke} />
        </View>
      ) : null}
    </Pressable>
  );
}

type Props = { nickname: string; onBack: () => void; onEnter: (request: RoomRequest) => void; onStart: () => void };

// "I want to talk": an optional mood, Find my room, and the rooms open now (docs/screens/04, live.md).
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

  const totalPeople = (rooms ?? []).reduce((n, r) => n + r.here, 0);

  return (
    <DoorLayout
      title="What kind of chat?"
      line="Optional. Skip it and we'll find a friendly room."
      onBack={onBack}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      footer={
        <>
          <Button label="Find my room" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'talk', mood })} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: space[1] }}>
            <Text variant="meta" color="textMeta">{`You'll join as ${nickname}, with your mic off.`}</Text>
            <Pressable accessibilityRole="link" onPress={() => setRulesOpen(true)} hitSlop={space[3]}>
              <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
                Room rules
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space[3] }}>
        {MOODS.map((m) => (
          <MoodTile key={m} mood={m} selected={mood === m} onPress={() => setMood(mood === m ? null : m)} />
        ))}
      </View>

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Open now</Text>
        {rooms && rooms.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <View style={{ width: space[2], height: space[2], borderRadius: radius.pill, backgroundColor: colors.live }} />
            <Text variant="meta" color="textSoft">
              {`${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} talking in ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`}
            </Text>
          </View>
        ) : null}

        {rooms === null && !failed ? (
          <View style={{ gap: space[3] }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ height: size.avatarList, borderRadius: radius.small, backgroundColor: colors.raised }} />
            ))}
          </View>
        ) : null}
        {failed && rooms === null ? (
          <Text variant="body" color="textSoft">
            We couldn't load the rooms. Check that you're online, then pull down to try again.
          </Text>
        ) : null}
        {rooms && rooms.length === 0 ? (
          <Text variant="body" color="textSoft">
            It's quiet right now. Tap Find my room and you'll be the first one in.
          </Text>
        ) : null}
        {(rooms ?? []).map((room) => (
          <RoomRow key={room.id} room={room} onJoin={() => onEnter({ kind: 'join', roomId: room.id })} />
        ))}
        <Button label="Start a talk room" variant="quiet" onPress={onStart} />
      </View>
      <RoomRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </DoorLayout>
  );
}
