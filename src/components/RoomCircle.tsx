import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { AudioLines, Hand, MicOff, Plus, User } from 'lucide-react-native';
import { ROOM_CAPACITY } from '../config';
import { assignSeats, seatPoints, seatsOpenText } from '../lib/seats';
import { border, effects, motion, opacity, radius, roomGlowScale, size, space, speaking, useColors } from '../theme';
import type { Person } from '../voice/useVoiceRoom';
import { Avatar } from './Avatar';
import { Glow } from './Glow';
import { Text } from './Text';

const LABEL_SPACE = space[7];

// Up to 6 seats: a 248 ring with 64 avatars. 7 to 10 seats: a wider ring with 48 avatars
// (design direction › The room circle).
type Geometry = { ring: number; radius: number; avatar: number; stageW: number; stageH: number; labelW: number; centre: { x: number; y: number } };
function geometry(seats: number): Geometry {
  const big = seats > 6;
  const ring = big ? size.roomRingLarge : size.roomRing;
  const avatar = big ? size.avatarSeatSmall : size.avatarRoom;
  const radius = ring / 2;
  const stageW = ring + avatar;
  return {
    ring,
    radius,
    avatar,
    stageW,
    stageH: ring + avatar + LABEL_SPACE,
    labelW: big ? avatar + space[4] : avatar + space[5] + space[3],
    centre: { x: stageW / 2, y: avatar / 2 + radius },
  };
}

function seatLabel(p: Person): string {
  const name = p.isMe ? 'You' : p.nickname;
  const parts = [name];
  if (p.isHost) parts.push('host');
  if (p.isSpeaking) parts.push('speaking');
  else if (p.isMuted) parts.push('muted');
  if (p.handUp) parts.push('hand up');
  return parts.join(', ');
}

function SpeakingGlow({ on, reduceMotion, avatar }: { on: boolean; reduceMotion: boolean; avatar: number }) {
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
  const grown = (avatar + (speaking.gap + speaking.ring + speaking.glow) * 2) * 1.6;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: avatar / 2 - grown / 2,
        top: avatar / 2 - grown / 2,
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
  g,
}: {
  person: Person | null;
  point: { x: number; y: number };
  reduceMotion: boolean;
  onPress?: (person: Person) => void;
  g: Geometry;
}) {
  const colors = useColors();
  const left = g.centre.x + point.x - g.avatar / 2;
  const top = g.centre.y + point.y - g.avatar / 2;

  if (!person) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left,
          top,
          width: g.avatar,
          height: g.avatar,
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
      style={{ position: 'absolute', left, top, width: g.avatar, height: g.avatar }}
    >
      <SpeakingGlow on={person.isSpeaking} reduceMotion={reduceMotion} avatar={g.avatar} />
      <View
        style={
          person.isSpeaking
            ? {
                position: 'absolute',
                left: -(speaking.gap + speaking.ring),
                top: -(speaking.gap + speaking.ring),
                width: g.avatar + (speaking.gap + speaking.ring) * 2,
                height: g.avatar + (speaking.gap + speaking.ring) * 2,
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
        <Avatar userId={person.id} nickname={person.nickname} diameter={g.avatar} />
      </View>

      {person.handUp ? (
        <View
          style={{
            position: 'absolute',
            right: -space[1],
            bottom: -space[1],
            width: size.avatarBadge,
            height: size.avatarBadge,
            borderRadius: radius.pill,
            backgroundColor: colors.emberSoft,
            borderWidth: border.seatRing,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Hand size={size.iconBadge} color={colors.emberText} strokeWidth={size.iconStroke} />
        </View>
      ) : person.isMuted ? (
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
          top: g.avatar + space[2],
          left: (g.avatar - g.labelW) / 2,
          width: g.labelW,
          alignItems: 'center',
        }}
      >
        <Text variant="metaStrong" numberOfLines={1}>
          {name}
        </Text>
        {person.isSpeaking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
            {/* On the small 10-seat ring the word alone fits between the seats. */}
            {g.avatar >= size.avatarRoom ? <AudioLines size={size.iconMeta} color={colors.live} strokeWidth={size.iconStroke} /> : null}
            <Text variant="tiny" color="live">
              Speaking
            </Text>
          </View>
        ) : person.handUp ? (
          <Text variant="tiny" color="emberText">
            Hand up
          </Text>
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
  // Up to 10 seats (design direction › The room circle).
  const seatCount = Math.min(Math.max(capacity, people.length), size.maxSeats);
  const g = geometry(seatCount);
  const seats = assignSeats(me, others, seatCount);
  const points = seatPoints(seatCount, g.radius);
  const here = people.length;

  return (
    <View
      style={{ width: g.stageW, height: g.stageH, alignSelf: 'center' }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: g.centre.x - g.radius,
          top: g.centre.y - g.radius,
          width: g.ring,
          height: g.ring,
          borderRadius: radius.pill,
          borderWidth: border.seatRing,
          borderStyle: 'dashed',
          borderColor: colors.raised,
        }}
      />
      <Glow diameter={g.ring} centerX={g.centre.x} centerY={g.centre.y} />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: g.centre.x - g.radius,
          top: g.centre.y - g.radius,
          width: g.radius * 2,
          height: g.radius * 2,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: g.avatar / 2,
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
              left: g.centre.x + points[i].x - g.avatar / 2,
              top: g.centre.y + points[i].y - g.avatar / 2,
              width: g.avatar,
              height: g.avatar,
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
          g={g}
        />
        ),
      )}
    </View>
  );
}
