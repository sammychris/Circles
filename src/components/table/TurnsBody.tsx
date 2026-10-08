import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AudioLines } from 'lucide-react-native';
import type { TableItem, TableState } from '../../table/model';
import { border, radius, size, space, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { Avatar } from '../Avatar';
import { TableAction } from '../TableAction';
import { Text } from '../Text';

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type Props = {
  item: Extract<TableItem, { kind: 'turns' }>;
  state: TableState;
  me: string;
  people: Person[];
  onPass: () => void;
};

// Take turns: the speaking order with the current speaker highlighted and a gentle timer
// (activities.md › Table card states). The speaker can pass; the presenter can move on.
export function TurnsBody({ item, state, me, people, onPass }: Props) {
  const colors = useColors();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const order = (state.order ?? []).filter((id) => people.some((p) => p.id === id));
  const currentId = state.order?.[state.index ?? 0];
  const current = people.find((p) => p.id === currentId);
  const left = item.minutes * 60_000 - (now - (state.startedAt ?? now));
  const myTurn = currentId === me;
  const presenter = item.by === me;

  return (
    <View style={{ gap: space[4] }}>
      {item.topic ? <Text variant="heading">{item.topic}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <AudioLines size={size.icon} color={colors.live} strokeWidth={size.iconStroke} />
        {/* Only whose turn it is is announced, not every second of the timer. */}
        <Text variant="bodyStrong" style={{ flex: 1 }} accessibilityLiveRegion="polite">
          {current ? (myTurn ? "It's your turn" : `${current.nickname}'s turn`) : 'Getting the order ready'}
        </Text>
        <Text variant="metaStrong" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>
          {`${clock(left)} left`}
        </Text>
      </View>
      <View style={{ gap: space[2] }}>
        {order.map((id, i) => {
          const p = people.find((x) => x.id === id);
          if (!p) return null;
          const now = id === currentId;
          return (
            <View
              key={id}
              accessible
              accessibilityLabel={`${i + 1}. ${p.isMe ? 'You' : p.nickname}${now ? ', speaking now' : ''}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
                minHeight: size.minTarget,
                paddingHorizontal: space[3],
                borderRadius: radius.small,
                borderWidth: border.selected,
                borderColor: now ? colors.live : 'transparent',
                backgroundColor: now ? colors.liveSoft : 'transparent',
              }}
            >
              <Text variant="metaStrong" color="textMeta" style={{ width: size.iconMeta, fontVariant: ['tabular-nums'] }}>
                {String(i + 1)}
              </Text>
              <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarBadge} />
              <Text variant="bodyStrong" color={now ? 'live' : 'text'} style={{ flex: 1 }} numberOfLines={1}>
                {p.isMe ? 'You' : p.nickname}
              </Text>
            </View>
          );
        })}
      </View>
      {myTurn ? (
        <TableAction label="Pass to the next person" onPress={onPass} />
      ) : presenter ? (
        <TableAction label="Next person" onPress={onPass} />
      ) : (
        <Text variant="meta" color="textMeta" center>
          Your turn comes round. When it's yours, unmute and talk.
        </Text>
      )}
    </View>
  );
}
