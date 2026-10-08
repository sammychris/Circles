import { Pressable, View } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import { clockWords, dayAndTime, weeklyWords } from '../lib/when';
import { canGoIn, type Group, type ScheduledRoom } from '../rooms/schedule';
import { opacity, radius, size, space, useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

// "4 going, hosted by Ada": only a count, never who (tabs.md › Tonight).
function goingLine(room: ScheduledRoom): string {
  const host = room.mine ? 'hosted by you' : room.hostNickname ? `hosted by ${room.hostNickname}` : null;
  // The count first, so a long nickname never hides it.
  const going = `${room.going} going`;
  return host ? `${going}, ${host}` : going;
}

function isToday(at: Date, now = new Date()): boolean {
  return at.toDateString() === now.toDateString();
}

// One scheduled room: a time block, the title, who hosts and how many are going, then Remind me (a
// bell, outline when off, filled when on), or Go in from 5 minutes before it starts.
export function ScheduledRow({
  room,
  onToggle,
  onGoIn,
  disabled = false,
}: {
  room: ScheduledRoom;
  onToggle: () => void;
  onGoIn: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const open = canGoIn(room.startsAt);
  // Your own room, or one of your groups' meetings: the reminder comes with it.
  const automatic = room.mine || room.regular;
  const on = room.reminded || automatic;
  const day = isToday(room.startsAt) ? null : dayAndTime(room.startsAt).split(' at ')[0];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] }} accessible={false}>
      <View
        accessible
        accessibilityLabel={`${dayAndTime(room.startsAt)}. ${room.title}. ${goingLine(room)}.`}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3] }}
      >
        <View
          style={{
            // One width for every time ("7:30 pm" is the widest), so the titles line up.
            width: size.avatarList + space[5] + space[1],
            minHeight: size.avatarList,
            paddingHorizontal: space[2],
            borderRadius: radius.small,
            backgroundColor: colors.raised,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {day ? (
            <Text variant="tiny" color="textSoft">
              {day.slice(0, 3)}
            </Text>
          ) : null}
          <Text variant="metaStrong" style={{ fontVariant: ['tabular-nums'] }}>
            {clockWords(room.startsAt)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: space[1] }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {room.title}
          </Text>
          <Text variant="meta" color="textMeta" numberOfLines={1}>
            {goingLine(room)}
          </Text>
        </View>
      </View>
      {open ? (
        <Button label="Go in" disabled={disabled} onPress={onGoIn} style={{ minWidth: size.rowAction }} />
      ) : (
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={automatic ? 'Reminder on. It comes with your group or room.' : 'Remind me'}
          accessibilityState={{ checked: on, disabled: disabled || automatic }}
          disabled={disabled || automatic}
          onPress={onToggle}
          style={({ pressed }) => ({
            width: size.minTarget,
            height: size.minTarget,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <Bell
            size={size.icon}
            color={on ? colors.text : colors.textSoft}
            fill={on ? colors.text : 'none'}
            strokeWidth={size.iconStroke}
          />
        </Pressable>
      )}
    </View>
  );
}

// A weekly group as a card (circle-detail.md): name, when it meets, how many regulars, the next meeting.
export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const colors = useColors();
  const regulars = `${group.regulars} ${group.regulars === 1 ? 'regular' : 'regulars'}`;
  const mine = group.mine ? 'You host it' : group.regular ? "You're a regular" : null;
  const lines = [weeklyWords(group.days, group.time), [regulars, mine].filter(Boolean).join('. ')];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}. ${lines.join('. ')}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: space[4],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="heading" numberOfLines={1}>
          {group.name}
        </Text>
        <Text variant="meta" color="textSoft">
          {lines[0]}
        </Text>
        <Text variant="meta" color="textMeta">
          {lines[1]}
        </Text>
      </View>
      <ChevronRight size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
    </Pressable>
  );
}
