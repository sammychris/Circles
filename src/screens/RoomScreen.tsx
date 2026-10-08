import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dice5, Flag, Heart, LogOut, Shield, X } from 'lucide-react-native';
import { BlockSheet } from '../components/BlockSheet';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { CountdownRing } from '../components/CountdownRing';
import { HelpModal } from '../components/HelpModal';
import { MicControl, type MicState } from '../components/MicControl';
import { MicAskSheet, MicBlockedSheet } from '../components/MicSheets';
import { MiniProfileSheet, type SheetPerson } from '../components/MiniProfileSheet';
import { ReportSheet } from '../components/ReportSheet';
import { RoomCircle } from '../components/RoomCircle';
import { Sheet } from '../components/Sheet';
import { Text } from '../components/Text';
import { Toast } from '../components/Toast';
import { BASE } from '../games/ludo/engine';
import { LudoTable } from '../games/ludo/LudoTable';
import { useLudo } from '../games/ludo/useLudo';
import { SHOW_TEST_NUMBERS } from '../config';
import { mySavedIds, savePerson, unsavePerson } from '../lib/people';
import { listBlocked, type Blocked } from '../lib/safety';
import { formatJoinTime } from '../lib/seats';
import type { RoomRequest } from '../rooms/api';
import { MOOD_STYLE } from '../rooms/moods';
import { roomPhase, secondsLeft } from '../rooms/phase';
import { micPermissionGranted, requestMicPermission } from '../voice/foregroundService';
import { useVoiceRoom, type RoomSummary } from '../voice/useVoiceRoom';
import { radius, size, space, useColors } from '../theme';

const QUALITY_WORDS = {
  excellent: 'excellent',
  good: 'good',
  poor: 'poor',
  lost: 'lost',
  unknown: 'still being measured',
} as const;

export type Me = { id: string; nickname: string };

type Props = {
  me: Me;
  request: RoomRequest;
  // Called after leaving. No summary means the person never got into a room.
  onLeft: (summary: RoomSummary | null) => void;
  onMove: (request: RoomRequest) => void;
};

export function RoomScreen({ me, request, onLeft, onMove }: Props) {
  const colors = useColors();
  const voice = useVoiceRoom();
  const { status, room, people } = voice;
  const [micAllowed, setMicAllowed] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [profile, setProfile] = useState<SheetPerson | null>(null);
  const [toBlock, setToBlock] = useState<Blocked | null>(null);
  const [afterBlock, setAfterBlock] = useState<Blocked | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const onOpenHelp = useCallback(() => setHelpOpen(true), []);
  const [reportPerson, setReportPerson] = useState<SheetPerson | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [everLive, setEverLive] = useState(false);
  const [countdownFrom, setCountdownFrom] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);

  const connected = status === 'connected' || status === 'reconnecting';
  const isSupport = room?.door === 'support';
  const others = people.filter((p) => !p.isMe);
  const hostPresent = people.some((p) => p.isHost);
  const phase = connected ? roomPhase({ count: people.length, everLive, isSupport, hostPresent }) : null;
  const micLive = connected && people.some((p) => p.isMe && !p.isMuted);
  // Games only ever in play rooms, never in support rooms (CLAUDE.md, Never list).
  const isPlay = room?.door === 'play';
  const ludo = useLudo(room?.id ?? null, me.id, connected && isPlay);

  // --- joining: explain the microphone first, then join ---
  const startJoin = useCallback(() => {
    void voice.join(request);
  }, [voice, request]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void micPermissionGranted().then((granted) => {
      setMicAllowed(granted);
      if (granted) startJoin();
      else setAskOpen(true);
    });
  }, [startJoin]);

  // Blocked people are silenced; saved people show as saved.
  useEffect(() => {
    void listBlocked()
      .then((list) => voice.setSilencedList(list.map((b) => b.id)))
      .catch(() => {});
    void mySavedIds()
      .then(setSaved)
      .catch(() => {});
    // Once per room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          if (connected) void voice.startBackground();
        }
      });
    });
    return () => sub.remove();
  }, [micAllowed, connected, voice]);

  // --- room rules: 3 people to talk; a countdown when a live room drops to 2 ---
  useEffect(() => {
    if (phase === 'live') setEverLive(true);
    if (phase === 'countdown') setCountdownFrom((from) => from ?? Date.now());
    else setCountdownFrom(null);
    // Mics are paused whenever the room isn't live.
    if (phase && phase !== 'live' && micLive) void voice.setMic(false);
  }, [phase, micLive, voice]);

  useEffect(() => {
    if (countdownFrom === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [countdownFrom]);

  const leaveRoom = useCallback(async () => {
    const summary = await voice.leave();
    onLeft(summary);
  }, [voice, onLeft]);

  const countdown = countdownFrom === null ? null : secondsLeft(countdownFrom, now);
  useEffect(() => {
    if (countdown === 0) void leaveRoom();
  }, [countdown, leaveRoom]);

  const moveToAnotherRoom = useCallback(async () => {
    if (!room) return;
    await voice.leave();
    onMove({ kind: 'match', door: room.door, mood: room.mood, excludeRoomId: room.id });
  }, [room, voice, onMove]);

  // --- mic ---
  const onAllow = useCallback(async () => {
    setAskOpen(false);
    const granted = await requestMicPermission();
    setMicAllowed(granted);
    setMicDenied(!granted);
    startJoin();
  }, [startJoin]);

  const onListen = useCallback(() => {
    setAskOpen(false);
    startJoin();
  }, [startJoin]);

  const onMicPress = useCallback(async () => {
    if (!micAllowed) {
      const granted = await requestMicPermission();
      setMicAllowed(granted);
      setMicDenied(!granted);
      if (!granted) {
        setBlockedOpen(true);
        return;
      }
      await voice.startBackground();
    }
    const ok = await voice.setMic(!micLive);
    if (!ok) setBlockedOpen(true);
  }, [micAllowed, micLive, voice]);

  const micState: MicState =
    phase && phase !== 'live'
      ? 'paused'
      : !micAllowed
        ? micDenied
          ? 'blocked'
          : 'notAllowed'
        : micLive
          ? 'live'
          : 'muted';
  const pausedReason =
    isSupport && !hostPresent ? 'Waiting for a host' : phase === 'countdown' ? 'Finding a third person' : 'Rooms need three people';

  // --- people: save, block, report ---
  const toggleSave = useCallback(
    async (person: SheetPerson) => {
      const wasSaved = saved.has(person.id);
      setSaved((s) => {
        const next = new Set(s);
        if (wasSaved) next.delete(person.id);
        else next.add(person.id);
        return next;
      });
      try {
        if (wasSaved) await unsavePerson(me.id, person.id);
        else {
          await savePerson(me.id, person);
          setToast(`Saved. You'll connect if ${person.nickname} saves you too.`);
        }
      } catch {
        setSaved((s) => {
          const next = new Set(s);
          if (wasSaved) next.add(person.id);
          else next.delete(person.id);
          return next;
        });
        setToast("That didn't save. Check your connection.");
      }
    },
    [saved, me.id],
  );

  const onBlocked = useCallback(
    (person: Blocked) => {
      voice.silence(person.id);
      setToBlock(null);
      setProfile(null);
      setSaved((s) => {
        const next = new Set(s);
        next.delete(person.id);
        return next;
      });
      void unsavePerson(me.id, person.id).catch(() => {});
      setToast(`${person.nickname} is blocked. Undo in Me, Blocked people.`);
      if (people.some((p) => p.id === person.id)) setAfterBlock(person);
    },
    [voice, me.id, people],
  );

  // --- what to show ---
  const { joinMs, firstVoiceMs, quality } = voice.numbers;
  const mood = room?.mood ? MOOD_STYLE[room.mood] : null;
  const title = room?.title ?? (status === 'connecting' ? 'Finding your room' : 'Circles');

  let message: { title: string; body: string } | null = null;
  if (status === 'noHost') {
    message = {
      title: 'No host is on right now',
      body: 'Support rooms always have a trained host, and none is online at the moment. You can get help straight away, or come back a little later.',
    };
  } else if (status === 'full') {
    message = { title: 'That room just filled up', body: "We'll find you another one." };
  } else if (status === 'paused') {
    message = { title: 'Your account is paused', body: 'You can’t join rooms right now.' };
  } else if (status === 'error') {
    message = { title: "We couldn't get you into a room", body: "Check that you're online, then try again." };
  } else if (status === 'dropped') {
    message = { title: 'You were disconnected', body: 'Your connection dropped. You can join again.' };
  } else if (phase === 'waiting') {
    message = isSupport
      ? hostPresent
        ? { title: 'A quiet room is opening', body: 'It starts when three people are here. Mics stay off until then.' }
        : { title: 'Waiting for a host', body: 'Support rooms always have a trained host. Mics stay off until one is here.' }
      : people.length <= 1
        ? { title: "Nobody's here yet", body: "You're the first one here. A room starts when three people join." }
        : { title: 'One more to go', body: 'A room starts when three people join. Mics stay off until then.' };
  } else if (phase === 'countdown') {
    message =
      isSupport && !hostPresent
        ? { title: 'Your host has left', body: 'Support rooms need a trained host, so mics are paused for now.' }
        : { title: 'Finding a third person', body: 'Rooms need three people, so mics are paused for now.' };
  }

  const game = ludo.game;
  const table =
    connected && isPlay && game && phase === 'live' ? (
      <LudoTable
        state={game}
        me={me.id}
        people={people.map((p) => ({ id: p.id, nickname: p.nickname, isMe: p.isMe }))}
        onRoll={ludo.roll}
        onMove={ludo.move}
        onBringOut={() => {
          const team = game.turn;
          const first = game.tokens[team].findIndex((pos) => pos === BASE);
          if (first >= 0) ludo.move(first);
        }}
        onPlayAgain={() => ludo.start(people.map((p) => p.id))}
        onBackToTalking={ludo.endGame}
      />
    ) : null;
  const inGame = !!game && (game.teams.sun.includes(me.id) || game.teams.sky.includes(me.id));
  let tableAction = null;
  if (isPlay && phase === 'live') {
    if (!game) tableAction = <RowButton Icon={Dice5} label="Play Ludo" onPress={() => ludo.start(people.map((p) => p.id))} />;
    else if (game.startedBy === me.id) tableAction = <RowButton Icon={X} label="End game" onPress={ludo.endGame} />;
    else if (inGame) tableAction = <RowButton Icon={X} label="Leave game" onPress={ludo.leaveGame} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingHorizontal: space.gutter,
          minHeight: size.minTarget,
        }}
      >
        {connected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report"
            onPress={() => {
              setReportPerson(null);
              setReportOpen(true);
            }}
            style={{
              minHeight: size.minTarget,
              minWidth: size.minTarget,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space[2],
            }}
          >
            <Flag size={size.iconMeta} color={colors.textMeta} strokeWidth={size.iconStroke} />
            <Text variant="bodyStrong" color="textMeta">
              Report
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space[5], gap: space[5] }}>
        <View style={{ gap: space[3] }}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {mood || (isSupport && hostPresent) ? (
            <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
              {mood ? <Chip Icon={mood.Icon} label={mood.label} fg={mood.fg} bg={mood.bg} /> : null}
              {isSupport && hostPresent ? (
                <Chip Icon={Shield} label="Trained host" fg={colors.live} bg={colors.liveSoft} />
              ) : null}
            </View>
          ) : null}
        </View>

        {table ?? (
          <RoomCircle
            people={people}
            capacity={room?.capacity}
            emptyHint={status === 'connecting' ? 'Finding your room' : undefined}
            centre={countdown !== null ? <CountdownRing seconds={countdown} /> : undefined}
            onSeatPress={(p) => setProfile({ id: p.id, nickname: p.nickname, isHost: p.isHost })}
          />
        )}

        {status === 'reconnecting' ? (
          <Text variant="meta" color="textSoft" center accessibilityLiveRegion="polite">
            Reconnecting. Hang on.
          </Text>
        ) : null}

        {message ? (
          <View style={{ gap: space[2] }} accessibilityLiveRegion="polite">
            <Text variant="title" center>
              {message.title}
            </Text>
            <Text variant="body" color="textSoft" center>
              {message.body}
            </Text>
          </View>
        ) : null}

        {connected && phase === 'live' && SHOW_TEST_NUMBERS ? (
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

        {isSupport ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Need more than a chat tonight? Get help"
            onPress={onOpenHelp}
            style={{ minHeight: size.buttonSecondary + space[1], flexDirection: 'row', alignItems: 'center', gap: space[3] }}
          >
            <Heart size={size.icon} color={colors.helpIcon} strokeWidth={size.iconStroke} />
            <Text variant="body" color="textSoft" style={{ flex: 1 }}>
              Need more than a chat tonight?
            </Text>
            <Text variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
              Get help
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>
        <Toast message={toast} onDone={() => setToast(null)} />
        {connected ? (
          <>
            {phase === 'countdown' ? (
              <Button label="Move me to another room" variant="primary" onPress={() => void moveToAnotherRoom()} />
            ) : null}
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              {tableAction}
              <RowButton Icon={LogOut} label="Leave" onPress={() => void leaveRoom()} />
            </View>
            {phase !== 'countdown' ? (
              <MicControl state={micState} pausedReason={pausedReason} onPress={() => void onMicPress()} />
            ) : null}
          </>
        ) : status === 'connecting' ? (
          <>
            <Button label="Finding your room" variant="primary" loading onPress={() => {}} />
            <Button label="Cancel" variant="quiet" onPress={() => void leaveRoom()} />
          </>
        ) : (
          <>
            {status === 'noHost' ? (
              <Button label="Get help now" variant="primary" onPress={onOpenHelp} />
            ) : status === 'full' && request.kind === 'join' ? (
              <Button label="Find me another room" variant="primary" onPress={() => onMove({ kind: 'match', door: 'talk', mood: null })} />
            ) : status !== 'paused' && status !== 'idle' ? (
              <Button label="Try again" variant="primary" onPress={() => onMove(request)} />
            ) : null}
            <Button label="Back" variant="quiet" onPress={() => onLeft(null)} />
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
      <MiniProfileSheet
        person={profile}
        saved={!!profile && saved.has(profile.id)}
        onClose={() => setProfile(null)}
        onToggleSave={(p) => void toggleSave(p)}
        onBlock={(p) => {
          setProfile(null);
          setToBlock({ id: p.id, nickname: p.nickname });
        }}
        onReport={(p) => {
          setProfile(null);
          setReportPerson(p);
          setReportOpen(true);
        }}
      />
      <BlockSheet me={me.id} person={toBlock} onClose={() => setToBlock(null)} onBlocked={onBlocked} />
      <ReportSheet
        visible={reportOpen}
        roomId={room?.id ?? null}
        people={others.map((p) => ({ id: p.id, nickname: p.nickname }))}
        startWith={reportPerson}
        onClose={() => setReportOpen(false)}
        onAlsoBlock={(p) => setToBlock(p)}
        onSeeHelp={() => {
          setReportOpen(false);
          onOpenHelp();
        }}
      />
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} inRoom={connected} />
      <Sheet visible={!!afterBlock} onClose={() => setAfterBlock(null)}>
        <Text variant="title">{`You're both still in this room`}</Text>
        <Text variant="body" color="textSoft">
          {`You won't hear ${afterBlock?.nickname ?? 'them'} any more. You can also move to another room.`}
        </Text>
        <View style={{ gap: space[3] }}>
          <Button
            label="Move me to another room"
            variant="primary"
            onPress={() => {
              setAfterBlock(null);
              void moveToAnotherRoom();
            }}
          />
          <Button label="Stay for now" variant="quiet" onPress={() => setAfterBlock(null)} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

// Room bottom row button: 56 tall, radius 20, icon over a tiny label (design direction › Room bottom row).
function RowButton({ Icon, label, onPress }: { Icon: typeof LogOut; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        height: size.buttonPrimary,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
      }}
    >
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="tiny" color="textSoft">
        {label}
      </Text>
    </Pressable>
  );
}
