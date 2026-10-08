import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { AudioLines, MicOff, Plus, User } from 'lucide-react-native';
import { ROOM_CAPACITY } from '../config';
import { assignSeats, seatPoints, seatsOpenText } from '../lib/seats';
import { border, effects, motion, opacity, radius, roomGlowScale, size, space, speaking, useColors } from '../theme';
import type { Person } from '../voice/useVoiceRoom';
import { Avatar } from './Avatar';
import { Glow } from './Glow';
import { Text } from './Text';

const RADIUS = size.roomRing / 2;
const STAGE_WIDTH = size.roomRing + size.avatarRoom;
const LABEL_WIDTH = size.avatarRoom + space[5] + space[3];
const LABEL_SPACE = space[7];
const STAGE_HEIGHT = size.roomRing + size.avatarRoom + LABEL_SPACE;
const CENTRE = { x: STAGE_WIDTH / 2, y: size.avatarRoom / 2 + RADIUS };

function seatLabel(p: Person): string {
  const name = p.isMe ? 'You' : p.nickname;
  const parts = [name];
  if (p.isHost) parts.push('host');
  if (p.isSpeaking) parts.push('speaking');
  else if (p.isMuted) parts.push('muted');
  return parts.join(', ');
}

function SpeakingGlow({ on, reduceMotion }: { on: boolean; reduceMotion: boolean }) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!on || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: motion.breathe, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: motion.breathe, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, reduceMotion, pulse]);

  if (!on) return null;
  const grown = (size.avatarRoom + (speaking.gap + speaking.ring + speaking.glow) * 2) * 1.6;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: size.avatarRoom / 2 - grown / 2,
        top: size.avatarRoom / 2 - grown / 2,
        width: grown,
        height: grown,
        opacity: reduceMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [opacity.glowLow, 1] }),
      }}
    >
      <Glow diameter={grown} centerX={grown / 2} centerY={grown / 2} color={colors.live} strength={speaking.glowStrength} />
    </Animated.View>
  );
}

function Seat({
  person,
  point,
  reduceMotion,
  onPress,
}: {
  person: Person | null;
  point: { x: number; y: number };
  reduceMotion: boolean;
  onPress?: (person: Person) => void;
}) {
  const colors = useColors();
  const left = CENTRE.x + point.x - size.avatarRoom / 2;
  const top = CENTRE.y + point.y - size.avatarRoom / 2;

  if (!person) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left,
          top,
          width: size.avatarRoom,
          height: size.avatarRoom,
          borderRadius: radius.pill,
          borderWidth: border.seatRing,
          borderStyle: 'dashed',
          borderColor: colors.seatEmpty,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={size.icon} color={colors.seatEmpty} strokeWidth={size.iconStroke} />
      </View>
    );
  }

  const name = person.isMe ? 'You' : person.nickname;
  const tappable = !person.isMe && !!onPress;
  return (
    <Pressable
      accessible
      accessibilityRole={tappable ? 'button' : undefined}
      accessibilityLabel={seatLabel(person)}
      accessibilityHint={tappable ? 'Opens save, block and report' : undefined}
      disabled={!tappable}
      onPress={() => onPress?.(person)}
      hitSlop={space[2]}
      style={{ position: 'absolute', left, top, width: size.avatarRoom, height: size.avatarRoom }}
    >
      <SpeakingGlow on={person.isSpeaking} reduceMotion={reduceMotion} />
      <View
        style={
          person.isSpeaking
            ? {
                position: 'absolute',
                left: -(speaking.gap + speaking.ring),
                top: -(speaking.gap + speaking.ring),
                width: size.avatarRoom + (speaking.gap + speaking.ring) * 2,
                height: size.avatarRoom + (speaking.gap + speaking.ring) * 2,
                borderRadius: radius.pill,
                borderWidth: speaking.ring,
                borderColor: colors.live,
                backgroundColor: colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }
            : { position: 'absolute', left: 0, top: 0 }
        }
      >
        <Avatar userId={person.id} nickname={person.nickname} />
      </View>

      {person.isMuted ? (
        <View
          style={{
            position: 'absolute',
            right: -space[1],
            bottom: -space[1],
            width: size.avatarBadge,
            height: size.avatarBadge,
            borderRadius: radius.pill,
            backgroundColor: colors.raised,
            borderWidth: border.seatRing,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MicOff size={size.iconBadge} color={colors.textSoft} strokeWidth={size.iconStroke} />
        </View>
      ) : null}

      <View
        style={{
          position: 'absolute',
          top: size.avatarRoom + space[2],
          left: (size.avatarRoom - LABEL_WIDTH) / 2,
          width: LABEL_WIDTH,
          alignItems: 'center',
        }}
      >
        <Text variant="metaStrong" numberOfLines={1}>
          {name}
        </Text>
        {person.isSpeaking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
            <AudioLines size={size.iconMeta} color={colors.live} strokeWidth={size.iconStroke} />
            <Text variant="tiny" color="live">
              Speaking
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type Props = {
  people: Person[];
  capacity?: number;
  // Shown in the middle before anyone has joined.
  emptyHint?: string;
  // Replaces the "6 here" centre, e.g. the countdown ring.
  centre?: ReactNode;
  onSeatPress?: (person: Person) => void;
  // Taken seats without names, for people who may not see who's inside yet (a room link).
  anonymousTaken?: number;
};

export function RoomCircle({ people, capacity = ROOM_CAPACITY, emptyHint, centre, onSeatPress, anonymousTaken = 0 }: Props) {
  const colors = useColors();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const me = people.find((p) => p.isMe) ?? null;
  const others = people.filter((p) => !p.isMe);
  // The drawing has up to 6 seats (design direction › The room circle); bigger rooms show the first 6.
  const seatCount = Math.min(ROOM_CAPACITY, capacity);
  const seats = assignSeats(me, others, seatCount);
  const points = seatPoints(seatCount, RADIUS);
  const here = people.length;

  return (
    <View
      style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, alignSelf: 'center' }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: CENTRE.x - RADIUS,
          top: CENTRE.y - RADIUS,
          width: size.roomRing,
          height: size.roomRing,
          borderRadius: radius.pill,
          borderWidth: border.seatRing,
          borderStyle: 'dashed',
          borderColor: colors.raised,
        }}
      />
      <Glow diameter={size.roomRing} centerX={CENTRE.x} centerY={CENTRE.y} />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: CENTRE.x - RADIUS,
          top: CENTRE.y - RADIUS,
          width: RADIUS * 2,
          height: RADIUS * 2,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: size.avatarRoom / 2,
        }}
      >
        {centre ? (
          centre
        ) : here > 0 ? (
          <>
            <Text variant="heading" center>
              {here} here
            </Text>
            <Text variant="meta" color="textMeta" center>
              {seatsOpenText(here, capacity)}
            </Text>
          </>
        ) : (
          <Text variant="meta" color="textMeta" center>
            {emptyHint ?? seatsOpenText(0, capacity)}
          </Text>
        )}
      </View>
      {seats.map((person, i) =>
        !person && i < anonymousTaken ? (
          <View
            key={`taken-${i}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: 'absolute',
              left: CENTRE.x + points[i].x - size.avatarRoom / 2,
              top: CENTRE.y + points[i].y - size.avatarRoom / 2,
              width: size.avatarRoom,
              height: size.avatarRoom,
              borderRadius: radius.pill,
              backgroundColor: colors.raised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          </View>
        ) : (
        <Seat
          key={person?.id ?? `empty-${i}`}
          person={person}
          point={points[i]}
          reduceMotion={reduceMotion}
          onPress={onSeatPress}
        />
        ),
      )}
    </View>
  );
}
