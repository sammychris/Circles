import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EyeOff, Shield, Users } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Glow } from '../components/Glow';
import { ErrorLine } from '../components/ErrorLine';
import { Text } from '../components/Text';
import { EMAIL_ENABLED } from '../config';
import { seatPoints } from '../lib/seats';
import { radius, roomGlowScale, size, space, speaking, useColors } from '../theme';

const SAMPLE = ['Tolu', 'Ada', 'Chi', 'Bayo', 'Q'];
const RING_RADIUS = size.welcomeRing / 2;
const STAGE = size.welcomeRing + size.avatarWelcome + speaking.gap * 2 + speaking.ring * 2;

// A small ring of people around the lamp. One of them is speaking.
function LampDrawing() {
  const colors = useColors();
  const points = seatPoints(SAMPLE.length, RING_RADIUS);
  const centre = STAGE / 2;
  const glow = RING_RADIUS * roomGlowScale.edge;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: STAGE, height: STAGE, alignSelf: 'center' }}
    >
      <Glow diameter={glow * 2} centerX={centre} centerY={centre} />
      {SAMPLE.map((name, i) => {
        const isSpeaking = i === 0;
        const ring = isSpeaking ? speaking.gap + speaking.ring : 0;
        const outer = size.avatarWelcome + ring * 2;
        return (
          <View
            key={name}
            style={{
              position: 'absolute',
              left: centre + points[i].x - outer / 2,
              top: centre + points[i].y - outer / 2,
              width: outer,
              height: outer,
              borderRadius: radius.pill,
              borderWidth: isSpeaking ? speaking.ring : 0,
              borderColor: colors.live,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Avatar userId={name} nickname={name} diameter={size.avatarWelcome} />
          </View>
        );
      })}
    </View>
  );
}

function Row({ Icon, text }: { Icon: ComponentType<{ size: number; color: string; strokeWidth: number }>; text: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="body" color="textSoft" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

type Props = {
  onStart: () => void;
  onHaveAccount: () => void;
  starting: boolean;
  error: string | null;
};

export function WelcomeScreen({ onStart, onHaveAccount, starting, error }: Props) {
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[5], paddingBottom: space[5], gap: space[6] }}>
        <Text variant="heading" color="ember">
          Circles
        </Text>
        <LampDrawing />
        <Text variant="display" accessibilityRole="header">
          Come in and feel better with people
        </Text>
        <View style={{ gap: space[3] }}>
          <Row Icon={Users} text="Small voice rooms. Everyone gets to talk." />
          <Row Icon={EyeOff} text="No likes, no followers, no public numbers." />
          <Row Icon={Shield} text="Nickname in front. Hosts and rules keep it kind." />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>
        {error ? <ErrorLine message={error} /> : null}
        <Button label="Get started" variant="primary" loading={starting} onPress={onStart} />
        {EMAIL_ENABLED ? (
          <Button label="I already have an account" variant="quiet" disabled={starting} onPress={onHaveAccount} />
        ) : null}
        <Text variant="meta" color="textMeta" center>
          By continuing you agree to our Terms and Privacy Policy. 18+ only.
        </Text>
      </View>
    </SafeAreaView>
  );
}
