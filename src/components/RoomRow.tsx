import { Pressable, View } from 'react-native';
import { Hash } from 'lucide-react-native';
import type { OpenRoom } from '../rooms/api';
import { MOOD_STYLE } from '../rooms/moods';
import { levelLabel } from '../rooms/learn';
import { topicLabel } from '../rooms/start';
import { radius, size, space, useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

// One room in an "Open now" list: its icon, title, topic and seats, and Join. Home's suggestions add
// their reason ("Igbo, Beginner, like you") and can name the button ("Go back in"). `disabled`: offline.
export function RoomRow({
  room,
  onJoin,
  reason,
  action = 'Join',
  disabled = false,
}: {
  room: OpenRoom;
  onJoin: () => void;
  reason?: string;
  action?: string;
  disabled?: boolean;
}) {
  const colors = useColors();
  const topic = topicLabel(room.topic) ?? levelLabel(room.level);
  // Rooms people started show their topic; the others show their mood.
  const mood = topic || !room.mood ? { Icon: Hash, fg: colors.textSoft, bg: colors.raised } : MOOD_STYLE[room.mood];
  const full = room.here >= room.capacity;
  const seats = `${room.here} of ${room.capacity} seats`;
  const meta = reason ?? (topic ? `${topic}, ${seats}` : seats);
  return (
    // The whole row is one button for screen readers ("…, 4 of 6 seats. Join"), so Join is reachable.
    <Pressable
      accessible
      accessibilityRole={full ? undefined : 'button'}
      accessibilityLabel={`${room.title}.${topic ? ` ${topic}.` : ''} ${seats}.${reason ? ` ${reason}.` : ''} ${full ? 'Full.' : action}`}
      accessibilityState={{ disabled: full || disabled }}
      disabled={full || disabled}
      onPress={onJoin}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] }}
    >
      <View
        style={{
          width: size.avatarList,
          height: size.avatarList,
          borderRadius: radius.pill,
          backgroundColor: mood.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <mood.Icon size={size.iconButton20} color={mood.fg} strokeWidth={size.iconStroke} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {room.title}
        </Text>
        <Text variant="meta" color="textMeta" style={{ fontVariant: ['tabular-nums'] }}>
          {meta}
        </Text>
      </View>
      {full ? (
        <Text variant="metaStrong" color="textMeta" style={{ width: size.rowAction, textAlign: 'center' }}>
          Full
        </Text>
      ) : (
        <Button label={action} disabled={disabled} onPress={onJoin} style={{ minWidth: size.rowAction }} />
      )}
    </Pressable>
  );
}
