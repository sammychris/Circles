import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Heart, Lock, Phone } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Glow } from '../../components/Glow';
import { HelpModal } from '../../components/HelpModal';
import { Text } from '../../components/Text';
import { supportStatus, type RoomRequest } from '../../rooms/api';
import { radius, size, space, useColors } from '../../theme';

type Props = { onBack: () => void; onEnter: (request: RoomRequest) => void };

// "Someone to talk to" (docs/screens/02-someone-to-talk-to.png, doors.md › Need someone to talk to).
// Only rooms with a trained host. Nobody, not even friends, ever sees that someone is here.
export function SupportDoorScreen({ onBack, onEnter }: Props) {
  const colors = useColors();
  const [status, setStatus] = useState<{ hostInRoom: boolean; iAmHost: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await supportStatus());
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

  const open = status?.hostInRoom || status?.iAmHost;

  return (
    <DoorLayout
      title=""
      onBack={onBack}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      header={
        <View style={{ alignItems: 'center', gap: space[4] }}>
          <View style={{ width: size.avatarRoom * 2, height: size.avatarRoom * 2, alignItems: 'center', justifyContent: 'center' }}>
            <Glow diameter={size.avatarRoom * 3} centerX={size.avatarRoom} centerY={size.avatarRoom} />
            <View
              style={{
                width: size.avatarRoom,
                height: size.avatarRoom,
                borderRadius: radius.pill,
                backgroundColor: colors.emberSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={size.icon} color={colors.emberText} fill={colors.emberText} strokeWidth={size.iconStroke} />
            </View>
          </View>
          <Text variant="display" center accessibilityRole="header">
            Someone to talk to
          </Text>
          <Text variant="body" color="textSoft" center>
            A quiet room, kind people and a trained host. No games, no rush. Listen first if you like.
          </Text>
        </View>
      }
    >
      <View style={{ gap: space[3] }}>
        {status === null && !failed ? (
          <Button label="Checking for a host" variant="primary" loading onPress={() => {}} />
        ) : open ? (
          <>
            <Button label="Come in" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'support', mood: null })} />
            <Text variant="meta" color="textMeta" center>
              {status?.iAmHost && !status.hostInRoom ? "You're a host, so you'll open a room." : "You'll join with your mic off"}
            </Text>
          </>
        ) : (
          <View style={{ gap: space[2] }}>
            <Text variant="title" center>
              {failed ? "We couldn't check right now" : 'No host is on right now'}
            </Text>
            <Text variant="body" color="textSoft" center>
              {failed
                ? "Check that you're online, then pull down to try again."
                : 'Support rooms always have a trained host. Please check back a little later. If you need help now, tap Get help below.'}
            </Text>
          </View>
        )}
      </View>

      <View style={{ gap: space[3] }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="In crisis right now? Get help"
          onPress={() => setHelpOpen(true)}
          style={{ minHeight: size.minTarget + space[1], flexDirection: 'row', alignItems: 'center', gap: space[3] }}
        >
          <Phone size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          <Text variant="body" color="textSoft" style={{ flex: 1 }}>
            In crisis right now?
          </Text>
          <Text variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
            Get help
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Lock size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
          <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
            Nobody, not even friends, sees you're here
          </Text>
        </View>
      </View>
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} inRoom={false} />
    </DoorLayout>
  );
}
