import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { clock } from '../rooms/phase';
import { rules, size, useColors } from '../theme';
import { Text } from './Text';

// The "1:42 left to wait" ring in the middle of the room (docs/screens/06-room-drops-to-2.png).
export function CountdownRing({ seconds, total = rules.roomDropWaitSeconds }: { seconds: number; total?: number }) {
  const colors = useColors();
  const d = size.countdownRing;
  const stroke = size.countdownStroke;
  const r = (d - stroke) / 2;
  const length = 2 * Math.PI * r;
  const left = Math.max(0, Math.min(1, seconds / total));
  return (
    <View
      accessible
      accessibilityLabel={`${clock(seconds)} left to wait`}
      style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={d} height={d} style={{ position: 'absolute' }}>
        <Circle cx={d / 2} cy={d / 2} r={r} stroke={colors.raised} strokeWidth={stroke} fill="none" />
        <Circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          stroke={colors.text}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - left)}
          transform={`rotate(-90 ${d / 2} ${d / 2})`}
        />
      </Svg>
      <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {clock(seconds)}
      </Text>
      <Text variant="tiny" color="textSoft">
        left to wait
      </Text>
    </View>
  );
}
