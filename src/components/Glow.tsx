import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { glowStops } from '../theme';

// The soft ember lamp: 20% at the centre, 6% at 45%, gone by 70% (tokens.json › shadow.roomGlow).
export function Glow({
  diameter,
  centerX,
  centerY,
  color = glowStops.color,
  strength = 1,
}: {
  diameter: number;
  centerX: number;
  centerY: number;
  color?: string;
  // 1 = the lamp; higher for the speaking glow, which should read more clearly.
  strength?: number;
}) {
  const id = `glow-${color.replace('#', '')}-${strength}`;
  const r = diameter / 2;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: centerX - r, top: centerY - r, width: diameter, height: diameter }}
    >
      <Svg width={diameter} height={diameter}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {glowStops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={color} stopOpacity={Math.min(1, s.opacity * strength)} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
