import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flag, LogOut } from 'lucide-react-native';
import { Button } from '../components/Button';
import { MicControl, type MicState } from '../components/MicControl';
import { MicAskSheet, MicBlockedSheet } from '../components/MicSheets';
import { RoomCircle } from '../components/RoomCircle';
import { Text } from '../components/Text';
import { Toast } from '../components/Toast';
import { ROOM_CAPACITY, SHOW_TEST_NUMBERS } from '../config';
import { formatJoinTime } from '../lib/seats';
import { micPermissionGranted, requestMicPermission } from '../voice/foregroundService';
import { useVoiceRoom } from '../voice/useVoiceRoom';
import { radius, size, space, useColors } from '../theme';

const ROOM_TITLE = 'Test room';

const QUALITY_WORDS = {
  excellent: 'excellent',
  good: 'good',
  poor: 'poor',
  lost: 'lost',
  unknown: 'still being measured',
} as const;

type Props = {
  nickname: string;
  hasEmail: boolean;
  emailJustAdded: boolean;
  onAddEmail: () => void;
  onLogOut: () => void;
};

export function RoomScreen({ nickname, hasEmail, emailJustAdded, onAddEmail, onLogOut }: Props) {
  const colors = useColors();
  const room = useVoiceRoom(ROOM_TITLE);
  const [micAllowed, setMicAllowed] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [toast, setToast] = useState<string | null>(emailJustAdded ? 'Email added. Your account is safe.' : null);
  const [askOpen, setAskOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const connected = room.status === 'connected' || room.status === 'reconnecting';
  // The words on the mic button always come from what the room says, not from what we last tapped.
  const micLive = connected && room.people.some((p) => p.isMe && !p.isMuted);

  useEffect(() => {
    void micPermissionGranted().then(setMicAllowed);
  }, []);

  // Coming back from the phone's settings: pick up a newly allowed microphone.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void micPermissionGranted().then((granted) => {
        if (granted && !micAllowed) {
          setMicAllowed(true);
          setMicDenied(false);
          setToast('Microphone ready');
          if (connected) void room.startBackground();
        }
      });
    });
    return () => sub.remove();
  }, [micAllowed, connected, room]);

  const onJoin = useCallback(async () => {
    if (await micPermissionGranted()) {
      setMicAllowed(true);
      void room.join();
    } else {
      setAskOpen(true);
    }
  }, [room]);

  const onAllow = useCallback(async () => {
    setAskOpen(false);
    const granted = await requestMicPermission();
    setMicAllowed(granted);
    setMicDenied(!granted);
    void room.join();
  }, [room]);

  const onListen = useCallback(() => {
    setAskOpen(false);
    void room.join();
  }, [room]);

  const onMicPress = useCallback(async () => {
    if (!micAllowed) {
      const granted = await requestMicPermission();
      setMicAllowed(granted);
      setMicDenied(!granted);
      if (!granted) {
        setBlockedOpen(true);
        return;
      }
      await room.startBackground();
    }
    const ok = await room.setMic(!micLive);
    if (!ok) setBlockedOpen(true);
  }, [micAllowed, micLive, room]);

  const micState: MicState = !micAllowed ? (micDenied ? 'blocked' : 'notAllowed') : micLive ? 'live' : 'muted';
  const { joinMs, firstVoiceMs, quality } = room.numbers;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: space.gutter, minHeight: size.minTarget }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report"
          onPress={() => Alert.alert('Reporting', 'Reporting arrives in a later step of the build. This is a test version.')}
          style={{ minHeight: size.minTarget, minWidth: size.minTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] }}
        >
          <Flag size={size.iconMeta} color={colors.textMeta} strokeWidth={size.iconStroke} />
          <Text variant="bodyStrong" color="textMeta">
            Report
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space[5], gap: space[5] }}>
        <View style={{ gap: space[1] }}>
          <Text variant="display">{ROOM_TITLE}</Text>
          <Text variant="body" color="textSoft">
            {connected ? `You're in as ${nickname}.` : `You'll join as ${nickname}.`}
          </Text>
        </View>

        <RoomCircle people={room.people} emptyHint={`${ROOM_CAPACITY} seats open`} />

        {room.status === 'reconnecting' ? (
          <Text variant="meta" color="textSoft" center accessibilityLiveRegion="polite">
            Reconnecting. Hang on.
          </Text>
        ) : null}

        {connected && SHOW_TEST_NUMBERS ? (
          <View style={{ gap: space[1] }}>
            <Text variant="meta" color="textMeta" center>
              {joinMs === null ? 'Joining…' : `You joined in ${formatJoinTime(joinMs)}.`}
            </Text>
            <Text variant="meta" color="textMeta" center>
              {firstVoiceMs === null
                ? "You haven't heard anyone yet."
                : `You heard the first voice after ${formatJoinTime(firstVoiceMs)}.`}
            </Text>
            <Text variant="meta" color="textMeta" center>
              {`Your connection is ${QUALITY_WORDS[quality]}.`}
            </Text>
          </View>
        ) : null}

        {room.status === 'full' ? (
          <Text variant="body" color="textSoft" center accessibilityLiveRegion="polite">
            This room is full right now. Try again in a moment.
          </Text>
        ) : null}
        {room.status === 'dropped' ? (
          <Text variant="body" color="textSoft" center accessibilityLiveRegion="polite">
            You were disconnected from the room. You can join again.
          </Text>
        ) : null}
        {room.status === 'error' ? (
          <Text variant="body" color="textSoft" center accessibilityLiveRegion="polite">
            We couldn't get you into the room. Check that you're online, then try again.
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>
        <Toast message={toast} onDone={() => setToast(null)} />
        {connected ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leave"
              onPress={() => void room.leave()}
              style={{
                height: size.buttonPrimary,
                borderRadius: radius.card,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: space[1],
              }}
            >
              <LogOut size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
              <Text variant="tiny" color="textSoft">
                Leave
              </Text>
            </Pressable>
            <MicControl state={micState} onPress={() => void onMicPress()} />
          </>
        ) : (
          <>
            <Button
              label={room.status === 'connecting' ? 'Joining…' : 'Join the room'}
              variant="primary"
              loading={room.status === 'connecting'}
              onPress={() => void onJoin()}
            />
            {room.status === 'connecting' ? (
              <Button label="Cancel" variant="quiet" onPress={() => void room.leave()} />
            ) : (
              <Text variant="meta" color="textMeta" center>
                You'll join muted.
              </Text>
            )}
            {room.status !== 'connecting' ? (
              <>
                {!hasEmail ? <Button label="Add your email" variant="quiet" onPress={onAddEmail} /> : null}
                <Button label="Log out" variant="quiet" onPress={onLogOut} />
              </>
            ) : null}
          </>
        )}
      </View>

      <MicAskSheet visible={askOpen} onAllow={() => void onAllow()} onListen={onListen} />
      <MicBlockedSheet
        visible={blockedOpen}
        onOpenSettings={() => {
          setBlockedOpen(false);
          void Linking.openSettings();
        }}
        onClose={() => setBlockedOpen(false)}
      />
    </SafeAreaView>
  );
}
