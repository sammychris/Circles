import { View } from 'react-native';
import { Hash } from 'lucide-react-native';
import type { OpenRoom } from '../rooms/api';
import { MOOD_STYLE } from '../rooms/moods';
import { topicLabel } from '../rooms/start';
import { radius, size, space, useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

// One room in an "Open now" list: its icon, title, topic and seats, and Join.
export function RoomRow({ room, onJoin }: { room: OpenRoom; onJoin: () => void }) {
  const colors = useColors();
  const topic = topicLabel(room.topic);
  // Rooms people started show their topic; the others show their mood.
  const mood = topic || !room.mood ? { Icon: Hash, fg: colors.textSoft, bg: colors.raised } : MOOD_STYLE[room.mood];
  const full = room.here >= room.capacity;
  return (
    <View
      accessible
      accessibilityLabel={`${room.title}.${topic ? ` ${topic}.` : ''} ${room.here} of ${room.capacity} seats.${full ? ' Full.' : ''}`}
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
          {topic ? `${topic} · ${room.here} of ${room.capacity} seats` : `${room.here} of ${room.capacity} seats`}
        </Text>
      </View>
      {full ? (
        <Text variant="metaStrong" color="textMeta" style={{ width: size.rowAction, textAlign: 'center' }}>
          Full
        </Text>
      ) : (
        <Button label="Join" onPress={onJoin} style={{ width: size.rowAction }} />
      )}
    </View>
  );
}

