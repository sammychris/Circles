import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Flag, Hand, Hash, Heart, SquarePlus, LogOut, MessageCircle, Share2, Shield, X } from 'lucide-react-native';
import { BlockSheet } from '../components/BlockSheet';
import { Button } from '../components/Button';
import { ChatSheet } from '../components/ChatSheet';
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
import { ImpostorTable } from '../games/impostor/ImpostorTable';
import { ROUNDS_PER_GAME, phaseAt as impostorPhase } from '../games/impostor/logic';
import { useImpostor } from '../games/impostor/useImpostor';
import { NoteSheet, QuizSheet, TurnsSheet, VideoSheet } from '../components/table/ComposeSheets';
import { QuizBody } from '../components/table/QuizBody';
import { TurnsBody } from '../components/table/TurnsBody';
import { PutOnTableSheet, type TableChoice } from '../components/table/PutOnTableSheet';
import { NoteBody, SeatRow, TableCard, TableOptionsSheet } from '../components/table/TableCard';
import { PhotosBody } from '../components/table/PhotosBody';
import { ScreenBody } from '../components/table/ScreenBody';
import { WatchBody } from '../components/table/WatchBody';
import { pickAndUploadPhotos } from '../table/photos';
import { describeItem, findLink } from '../table/model';
import { useTable } from '../table/useTable';
import { PHOTO_URL_START, SHOW_TEST_NUMBERS, WEB_URL } from '../config';
import { roomLink } from '../lib/links';
import { mySavedIds, savePerson, unsavePerson } from '../lib/people';
import { listBlocked, type Blocked } from '../lib/safety';
import { formatJoinTime } from '../lib/seats';
import type { RoomRequest } from '../rooms/api';
import { MOOD_STYLE } from '../rooms/moods';
import { topicLabel } from '../rooms/start';
import { roomPhase, secondsLeft } from '../rooms/phase';
import { micPermissionGranted, requestMicPermission } from '../voice/foregroundService';
import { useVoiceRoom, type RoomSummary } from '../voice/useVoiceRoom';
import { border, motion, opacity, radius, size, space, useColors } from '../theme';

const QUALITY_WORDS = {
  excellent: 'excellent',
  good: 'good',
  poor: 'poor',
  lost: 'lost',
  unknown: 'still being measured',
} as const;

export type Me = { id: string; nickname: string };

// The web "keep this tab open" note has been shown in this visit.
let tabNoteShown = false;

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
  const clearToast = useCallback(() => setToast(null), []);
  // Web only, shown once: browsers may cut the sound when the screen locks (link-first.md › The room).
  const [tabNoteOpen, setTabNoteOpen] = useState(Platform.OS === 'web' && !tabNoteShown);
  const [reportPerson, setReportPerson] = useState<SheetPerson | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatReadAt, setChatReadAt] = useState(0);
  const [everLive, setEverLive] = useState(false);
  const [countdownFrom, setCountdownFrom] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);
  const left = useRef(false);
  const lastPhase = useRef<ReturnType<typeof roomPhase> | null>(null);

  const connected = status === 'connected' || status === 'reconnecting';
  const isSupport = room?.door === 'support';
  const others = people.filter((p) => !p.isMe);
  const hostPresent = people.some((p) => p.isHost);
  // While reconnecting, keep the room as it was: a short blip shouldn't start a countdown or mute anyone.
  const freshPhase = status === 'connected' ? roomPhase({ count: people.length, everLive, isSupport, hostPresent }) : null;
  if (freshPhase) lastPhase.current = freshPhase;
  const phase = status === 'reconnecting' ? lastPhase.current : freshPhase;
  const micLive = connected && people.some((p) => p.isMe && !p.isMuted);
  const handUpNow = connected && people.some((p) => p.isMe && p.handUp);
  // What the person just asked for, shown straight away while the server catches up.
  const [handWanted, setHandWanted] = useState<boolean | null>(null);
  const handBusy = useRef(false);
  const handUp = handWanted ?? handUpNow;
  useEffect(() => {
    if (handWanted !== null && handWanted === handUpNow) setHandWanted(null);
  }, [handWanted, handUpNow]);
  // Games only ever in play rooms, never in support rooms (CLAUDE.md, Never list).
  const isPlay = room?.door === 'play';
  const ludo = useLudo(room?.id ?? null, me.id, connected && isPlay, people.map((p) => p.id));
  const impostor = useImpostor(room?.id ?? null, me.id, connected && isPlay);
  // The Table: one shared thing in the middle of the room (activities.md).
  const tableItem = useTable(
    voice.publishData,
    voice.onData,
    me,
    room?.door ?? null,
    connected,
    people,
    PHOTO_URL_START,
    voice.reconnects,
  );
  const [putOpen, setPutOpen] = useState(false);
  const [compose, setCompose] = useState<'note' | 'video' | 'turns' | 'quiz' | null>(null);
  const [tableOptionsOpen, setTableOptionsOpen] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(false);
  // What was on the table when the report was opened, kept even if it comes off while they write.
  const [reportEvidence, setReportEvidence] = useState<string | null>(null);
  useEffect(() => {
    if (reportOpen) setReportEvidence(tableItem.item ? describeItem(tableItem.item) : null);
    // Only at the moment the report opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportOpen]);
  const [wordHidden, setWordHidden] = useState(false);
  // A new round starts with the word showing.
  const impostorRoundId = impostor.round?.roundId;
  useEffect(() => setWordHidden(false), [impostorRoundId]);

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
      .then((list) => {
        voice.setSilencedList(list.map((b) => b.id));
        setBlockedIds(new Set(list.map((b) => b.id)));
      })
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
    if (phase === 'countdown') {
      setCountdownFrom((from) => {
        if (from !== null) return from;
        setNow(Date.now());
        return Date.now();
      });
    } else setCountdownFrom(null);
    // Mics are paused whenever the room isn't live.
    if (phase && phase !== 'live' && micLive) void voice.setMic(false);
  }, [phase, micLive, voice.setMic]);

  useEffect(() => {
    if (countdownFrom === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [countdownFrom]);

  // Only ever leaves once, however many things ask at the same moment (Leave, the countdown ending).
  const leaveRoom = useCallback(async () => {
    if (left.current) return;
    left.current = true;
    setCountdownFrom(null);
    ludo.leaveGame();
    const summary = (await voice.leave()) ?? voice.lastSummary;
    onLeft(summary);
  }, [voice, onLeft, ludo]);

  const countdown = countdownFrom === null ? null : secondsLeft(countdownFrom, now);
  useEffect(() => {
    if (countdown === 0) void leaveRoom();
  }, [countdown, leaveRoom]);

  const moveToAnotherRoom = useCallback(async () => {
    if (!room || left.current) return;
    left.current = true;
    setCountdownFrom(null);
    ludo.leaveGame();
    await voice.leave();
    onMove({ kind: 'match', door: room.door, mood: room.mood, excludeRoomId: room.id });
  }, [room, voice, onMove, ludo]);

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
      tableItem.dismissFrom(person.id);
      setBlockedIds((s) => new Set(s).add(person.id));
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
    [voice, me.id, people, tableItem.dismissFrom],
  );

  useEffect(() => {
    if (connected && tabNoteOpen) tabNoteShown = true;
  }, [connected, tabNoteOpen]);

  // --- raise hand: it comes down by itself once you start talking ---
  useEffect(() => {
    if (micLive && handUpNow && !handBusy.current) {
      handBusy.current = true;
      void voice.setHand(false).finally(() => {
        handBusy.current = false;
      });
    }
  }, [micLive, handUpNow, voice.setHand]);

  const toggleHand = useCallback(async () => {
    if (handBusy.current) return;
    handBusy.current = true;
    const want = !handUp;
    setHandWanted(want);
    const ok = await voice.setHand(want);
    handBusy.current = false;
    if (!ok) {
      setHandWanted(null);
      setToast("That didn't work. Try again in a moment.");
    } else if (want) setToast('Hand up. Everyone can see it on your seat.');
  }, [voice.setHand, handUp]);

  // Games draw their own seats without hands, so a hand comes down when a game or round starts.
  const gameKey = `${ludo.game?.id ?? ''}:${impostor.round?.roundId ?? ''}`;
  useEffect(() => {
    if (gameKey !== ':' && handUpNow && !handBusy.current) {
      handBusy.current = true;
      void voice.setHand(false).finally(() => {
        handBusy.current = false;
      });
    }
    // Only when a game or round starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  // --- chat: messages from blocked people are never shown ---
  const chat = voice.messages.filter((m) => !blockedIds.has(m.from));
  const lastChatAt = chat.length > 0 ? chat[chat.length - 1].at : 0;
  useEffect(() => {
    if (chatOpen) setChatReadAt(lastChatAt);
  }, [chatOpen, lastChatAt]);
  const unread = chatOpen ? 0 : chat.filter((m) => !m.mine && m.at > chatReadAt).length;
  // Chat follows the same rule as the mics: nothing new until the room is live (three people, and a
  // trained host in support rooms).
  const chatPaused =
    phase === 'live'
      ? null
      : isSupport && !hostPresent
        ? 'Chat is paused until a trained host is here.'
        : 'Chat opens when three people are here.';
  // Tapping a name in chat opens their profile; closing it goes back to the chat.
  const [profileFromChat, setProfileFromChat] = useState(false);

  // --- what to show ---
  const { joinMs, firstVoiceMs, quality } = voice.numbers;
  const mood = room?.mood ? MOOD_STYLE[room.mood] : null;
  const topic = topicLabel(room?.topic);
  // During Find the Impostor the header shows the game and the round (docs/screens/12).
  const impostorOn = connected && room?.door === 'play' && phase === 'live' && !ludo.game && !!impostor.round;
  const title = impostorOn
    ? 'Find the Impostor'
    : room?.title ?? (status === 'connecting' ? 'Finding your room' : 'Circles');

  let message: { title: string; body: string } | null = null;
  if (status === 'noHost') {
    message = {
      title: 'No host is on right now',
      body: 'Support rooms always have a trained host, and none is online at the moment. You can get help straight away, or come back a little later.',
    };
  } else if (status === 'full') {
    message = { title: 'That room just filled up', body: "We'll find you another one." };
  } else if (status === 'tooMany') {
    message = { title: "You've started a few rooms already", body: 'Try again in a while, or join a room that’s open now.' };
  } else if (status === 'badTitle') {
    message = { title: 'That name can’t be used', body: 'Go back and pick another name. Room names can’t have phone numbers or links, or look like the Circles team or a support room.' };
  } else if (status === 'ended') {
    message = { title: 'This room has ended', body: 'Everyone has gone home. There are other rooms open now.' };
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
        ? {
            title: room?.mood === 'laugh' ? "Nobody's laughing yet" : room?.mood === 'advice' ? 'Nobody else here yet' : "Nobody's here yet",
            body: "You're the first one here. A room starts when three people join.",
          }
        : { title: 'One more to go', body: 'A room starts when three people join. Mics stay off until then.' };
  } else if (phase === 'countdown') {
    message =
      isSupport && !hostPresent
        ? { title: 'Your host has left', body: 'Support rooms need a trained host, so mics are paused for now.' }
        : { title: 'Finding a third person', body: 'Rooms need three people, so mics are paused for now.' };
  }

  const game = ludo.game;
  const round = impostor.round;
  const everyone = people.map((p) => p.id);
  const openProfile = (p: { id: string; nickname: string }) => setProfile({ id: p.id, nickname: p.nickname });
  let table = null;
  if (connected && isPlay && phase === 'live' && game) {
    table = (
      <LudoTable
        state={game}
        me={me.id}
        people={people}
        onPerson={openProfile}
        onRoll={ludo.roll}
        onMove={ludo.move}
        onBringOut={() => {
          const team = game.turn;
          const first = game.tokens[team].findIndex((pos) => pos === BASE);
          if (first >= 0) ludo.move(first);
        }}
        onPlayAgain={() => ludo.start(everyone)}
        onBackToTalking={ludo.endGame}
      />
    );
  } else if (connected && isPlay && phase === 'live' && round) {
    table = (
      <ImpostorTable
        round={round}
        now={impostor.now}
        me={me.id}
        people={people}
        playing={impostor.playing}
        card={impostor.card}
        hidden={wordHidden}
        onShowWord={() => setWordHidden(false)}
        myVote={impostor.myVote}
        outcome={impostor.outcome}
        onVote={(id) => void impostor.castVote(id)}
        onPerson={openProfile}
        onNextRound={() => impostor.nextRound(everyone)}
        onPlayAgain={() => impostor.startGame(everyone)}
        onBackToTalking={impostor.endGame}
        busy={impostor.busy}
      />
    );
  }

  // --- the table: open it, put something on it, replace your own ---
  function openTable() {
    if (phase !== 'live') {
      setToast(isSupport && !hostPresent ? 'The table opens when a trained host is here.' : 'The table opens when three people are here.');
      return;
    }
    if (tableItem.item && !tableItem.canTakeOff) {
      setToast(`${tableItem.item.byName} has something on the table. It's theirs to take off.`);
      return;
    }
    setPutOpen(true);
  }

  function confirmReplace(then: () => void) {
    if (!tableItem.item) return then();
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Replace what’s on the table?')) then();
      return;
    }
    Alert.alert('Replace what’s on the table?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', onPress: then },
    ]);
  }

  function onTablePick(choice: TableChoice) {
    setPutOpen(false);
    confirmReplace(() => {
      if (choice === 'ludo' || choice === 'impostor') {
        if (tableItem.item) tableItem.takeOff();
        setWordHidden(false);
        if (choice === 'ludo') ludo.start(everyone);
        else impostor.startGame(everyone);
      } else if (choice === 'note' || choice === 'video' || choice === 'turns' || choice === 'quiz') {
        setTimeout(() => setCompose(choice), motion.slow);
      } else if (choice === 'photos') {
        setTimeout(() => void putPhotos(), motion.slow);
      } else if (choice === 'screen') {
        setTimeout(confirmScreenShare, motion.slow);
      }
    });
  }

  if (!table && connected && phase === 'live' && tableItem.item) {
    const item = tableItem.item;
    table = (
      <View style={{ gap: space[4] }}>
        <SeatRow people={people} onPerson={(p) => setProfile({ id: p.id, nickname: p.nickname, isHost: p.isHost })} />
        <TableCard item={item} me={me.id} onOptions={() => setTableOptionsOpen(true)}>
          {item.kind === 'note' ? <NoteBody item={item} /> : null}
          {item.kind === 'turns' ? (
            <TurnsBody key={item.id} item={item} state={tableItem.state} me={me.id} people={people} onPass={tableItem.passTurn} />
          ) : null}
          {item.kind === 'quiz' ? (
            <QuizBody
              key={item.id}
              item={item}
              state={tableItem.state}
              mine={tableItem.mine}
              myAnswer={tableItem.myAnswer}
              answeredCount={tableItem.answeredCount}
              peopleCount={people.length}
              onAnswer={tableItem.answer}
              onReveal={tableItem.reveal}
            />
          ) : null}
          {item.kind === 'photos' ? (
            <PhotosBody key={item.id} item={item} state={tableItem.state} mine={tableItem.mine} onPresent={tableItem.present} />
          ) : null}
          {item.kind === 'screen' ? (
            <ScreenBody
              key={item.id}
              item={item}
              mine={tableItem.mine}
              track={voice.screens[item.by]}
              onWatch={(on) => voice.watchScreen(item.by, on)}
              onStop={() => tableItem.takeOff()}
            />
          ) : null}
          {item.kind === 'video' ? (
            <WatchBody
              key={item.id}
              item={item}
              state={tableItem.state}
              mine={tableItem.mine}
              othersTalking={people.some((p) => !p.isMe && p.isSpeaking)}
              onPresent={tableItem.present}
            />
          ) : null}
        </TableCard>
      </View>
    );
  }

  // Share my screen: a clear warning first, then the phone's own permission prompt.
  function confirmScreenShare() {
    const warning = 'Everyone in this room will see your whole screen, including messages and notifications that pop up.';
    const go = () => void startScreenShare();
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${warning} Share your screen?`)) go();
      return;
    }
    Alert.alert('Share your screen?', `${warning} Turning on Do Not Disturb first helps.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: go },
    ]);
  }

  async function startScreenShare() {
    startingShare.current = true;
    const ok = await voice.setScreenShare(true);
    if (ok) await tableItem.put({ kind: 'screen' });
    else setToast("Screen sharing didn't start.");
    startingShare.current = false;
  }

  async function putPhotos() {
    if (!room || photosBusy) return;
    setPhotosBusy(true);
    const result = await pickAndUploadPhotos(me.id, room.id);
    setPhotosBusy(false);
    if ('photos' in result) void tableItem.put({ kind: 'photos', photos: result.photos }, { index: 0 });
    else if ('error' in result) setToast(result.error);
  }

  // One game on the table at a time. Whoever started it can end it; if they've left, anyone can.
  const inGame = !!game && (game.teams.sun.includes(me.id) || game.teams.sky.includes(me.id));
  const starterHere = !!game && people.some((p) => p.id === game.startedBy);
  const roundStarterHere = !!round && people.some((p) => p.id === round.startedBy);
  const speakingNow = !!round && !impostor.outcome && impostorPhase(round, impostor.now).kind === 'speaking';
  let tableAction = null;
  let secondAction = null;
  if (isPlay && phase === 'live') {
    if (game) {
      if (game.startedBy === me.id || !starterHere) tableAction = <RowButton Icon={X} label="End game" onPress={ludo.endGame} />;
      else if (inGame) tableAction = <RowButton Icon={X} label="Leave game" onPress={ludo.leaveGame} />;
    } else if (round) {
      if (impostor.playing && speakingNow) {
        secondAction = wordHidden ? (
          <RowButton Icon={Eye} label="Show word" onPress={() => setWordHidden(false)} />
        ) : (
          <RowButton Icon={EyeOff} label="Hide word" onPress={() => setWordHidden(true)} />
        );
      }
      if (round.startedBy === me.id || !roundStarterHere) tableAction = <RowButton Icon={X} label="End game" onPress={impostor.endGame} />;
    }
  }
  if (!tableAction && connected) tableAction = <RowButton Icon={SquarePlus} label="Table" onPress={openTable} />;

  // Your screen is shared only while it's your item on the table. If sharing stops from the phone's own
  // notification, the item comes off too.
  const meSharing = people.some((p) => p.isMe && p.sharingScreen);
  const screenOnTable = tableItem.mine && tableItem.item?.kind === 'screen';
  const sawSharing = useRef(false);
  // Between sharing starting and the card going on the table.
  const startingShare = useRef(false);
  useEffect(() => {
    if (meSharing && screenOnTable) sawSharing.current = true;
    if (meSharing && !screenOnTable && !startingShare.current) void voice.setScreenShare(false);
    if (!meSharing && screenOnTable && sawSharing.current) {
      sawSharing.current = false;
      tableItem.takeOff();
    }
    // The room stopped being live (it dropped to two): the table hides, so a shared screen stops.
    if (screenOnTable && phase && phase !== 'live') tableItem.takeOff();
  }, [meSharing, screenOnTable, phase, voice.setScreenShare, tableItem.takeOff]);

  // A game took over the table: your own item comes off. Someone else's item lost the table: tell them.
  useEffect(() => {
    if ((ludo.game || impostor.round) && tableItem.mine) tableItem.takeOff();
  }, [ludo.game, impostor.round, tableItem.mine, tableItem.takeOff]);
  const { bumped, clearBumped } = tableItem;
  useEffect(() => {
    if (!bumped) return;
    setToast('Someone else put something on the table at the same moment.');
    clearBumped();
  }, [bumped, clearBumped]);

  // Raise hand, except during a game: game seats don't show hands.
  const inAnyGame = !!ludo.game || !!impostor.round;
  const handButton = (
    <RowButton
      Icon={Hand}
      label={handUp ? 'Lower hand' : 'Raise hand'}
      active={handUp}
      disabled={micLive && !handUp}
      onPress={() => void toggleHand()}
    />
  );

  // Invite: share this room's link. Never for support rooms (CLAUDE.md, Never list), and only once the
  // web version is online, so the link works for people without the app.
  const canInvite = connected && !!room && room.door !== 'support' && !!WEB_URL;
  const invite = async () => {
    if (!room) return;
    const link = roomLink(WEB_URL, room.id, me.nickname);
    const message = `${room.door === 'play' ? 'Come and play' : 'Come and talk'} with me on Circles: ${link}`;
    try {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav?.share) await nav.share({ text: message });
        else {
          await nav?.clipboard?.writeText(link);
          setToast('Link copied. Paste it to a friend.');
        }
      } else {
        await Share.share({ message });
      }
    } catch {
      // They closed the share sheet.
    }
  };

  // You just started an invite-only room: the share menu opens once, so you can send the link.
  const autoInvited = useRef(false);
  useEffect(() => {
    if (!canInvite || autoInvited.current || request.kind !== 'create' || !request.private) return;
    autoInvited.current = true;
    // Browsers only share after a tap, so on the web we point at the Invite button instead.
    if (Platform.OS === 'web') setToast('Your room is ready. Tap Invite to send the link.');
    else void invite();
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.gutter,
          minHeight: size.minTarget,
        }}
      >
        {canInvite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Invite someone to this room"
            onPress={() => void invite()}
            style={{ minHeight: size.minTarget, minWidth: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[2] }}
          >
            <Share2 size={size.iconMeta} color={colors.textMeta} strokeWidth={size.iconStroke} />
            <Text variant="bodyStrong" color="textMeta">
              Invite
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
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
          {impostorOn && impostor.round ? (
            <Text variant="bodyStrong" color="textSoft">{`Round ${impostor.round.number} of ${ROUNDS_PER_GAME}`}</Text>
          ) : mood || topic || (isSupport && hostPresent) ? (
            <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
              {mood ? <Chip Icon={mood.Icon} label={mood.label} fg={mood.fg} bg={mood.bg} /> : null}
              {topic ? <Chip Icon={Hash} label={topic} fg={colors.textSoft} bg={colors.raised} /> : null}
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

        {connected && voice.audioBlocked ? (
          <Button label="Tap to hear the room" onPress={() => void voice.unblockAudio()} />
        ) : null}

        {connected && tabNoteOpen ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: colors.surface, borderRadius: radius.small, padding: space[3] }}>
            <Text variant="meta" color="textSoft" style={{ flex: 1 }}>
              Keep this tab open. If your screen locks, the sound may stop.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={() => setTabNoteOpen(false)}
              style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={size.iconMeta} color={colors.textSoft} strokeWidth={size.iconStroke} />
            </Pressable>
          </View>
        ) : null}

        {photosBusy ? (
          <Text variant="meta" color="textSoft" center accessibilityLiveRegion="polite">
            Getting your photos ready…
          </Text>
        ) : null}

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
        <Toast message={toast} onDone={clearToast} />
        {connected ? (
          <>
            {phase === 'countdown' ? (
              <Button label="Move me to another room" variant="primary" onPress={() => void moveToAnotherRoom()} />
            ) : null}
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              {secondAction ?? (inAnyGame ? null : handButton)}
              <RowButton
                Icon={MessageCircle}
                label="Chat"
                badge={unread}
                onPress={() => setChatOpen(true)}
              />
              {tableAction}
              {phase === 'countdown' ? (
                <Button label="Leave" variant="quiet" onPress={() => void leaveRoom()} style={{ flex: 1 }} />
              ) : (
                <RowButton Icon={LogOut} label="Leave" onPress={() => void leaveRoom()} />
              )}
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
            ) : (status === 'full' || status === 'ended') && request.kind === 'join' ? (
              <Button label="Find me another room" variant="primary" onPress={() => onMove({ kind: 'match', door: room?.door === 'play' || (request.kind === 'join' && request.door === 'play') ? 'play' : 'talk', mood: null })} />
            ) : status !== 'paused' && status !== 'idle' && status !== 'tooMany' && status !== 'badTitle' ? (
              // A room you started is rejoined, not started again.
              <Button
                label="Try again"
                variant="primary"
                onPress={() => onMove(request.kind === 'create' && room ? { kind: 'join', roomId: room.id } : request)}
              />
            ) : null}
            <Button label="Back" variant="quiet" onPress={() => onLeft(voice.lastSummary)} />
          </>
        )}
      </View>

      <MicAskSheet visible={askOpen} onAllow={() => void onAllow()} onListen={onListen} />
      <MicBlockedSheet
        visible={blockedOpen}
        onOpenSettings={() => {
          setBlockedOpen(false);
          if (Platform.OS !== 'web') void Linking.openSettings();
        }}
        onClose={() => setBlockedOpen(false)}
      />
      <MiniProfileSheet
        person={profile}
        saved={!!profile && saved.has(profile.id)}
        onClose={() => {
          setProfile(null);
          if (profileFromChat) {
            setProfileFromChat(false);
            setTimeout(() => setChatOpen(true), motion.slow);
          }
        }}
        onToggleSave={(p) => void toggleSave(p)}
        onBlock={(p) => {
          setProfile(null);
          setProfileFromChat(false);
          setToBlock({ id: p.id, nickname: p.nickname });
        }}
        onReport={(p) => {
          setProfile(null);
          setProfileFromChat(false);
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
        evidence={reportEvidence}
        onClose={() => setReportOpen(false)}
        onAlsoBlock={(p) => setToBlock(p)}
        onSeeHelp={() => {
          setReportOpen(false);
          onOpenHelp();
        }}
      />
      {room ? (
        <PutOnTableSheet
          visible={putOpen}
          door={room.door}
          gamesReady={ludo.ready && impostor.ready}
          onClose={() => setPutOpen(false)}
          onPick={onTablePick}
        />
      ) : null}
      <NoteSheet
        visible={compose === 'note'}
        onClose={() => setCompose(null)}
        onPut={(text) => {
          setCompose(null);
          void tableItem.put({ kind: 'note', text, link: findLink(text) });
        }}
      />
      <VideoSheet
        visible={compose === 'video'}
        onClose={() => setCompose(null)}
        onPut={(video, title) => {
          setCompose(null);
          void tableItem.put({ kind: 'video', video, title }, { playing: false, position: 0, sentAt: Date.now() });
        }}
      />
      <TurnsSheet
        visible={compose === 'turns'}
        onClose={() => setCompose(null)}
        onPut={(topic, minutes) => {
          setCompose(null);
          // Everyone here, starting with you; people who arrive later join the end.
          const order = [me.id, ...people.filter((p) => !p.isMe).map((p) => p.id)];
          void tableItem.put({ kind: 'turns', topic, minutes }, { order, index: 0, startedAt: Date.now() });
        }}
      />
      <QuizSheet
        visible={compose === 'quiz'}
        onClose={() => setCompose(null)}
        onPut={(question, answers, correct) => {
          setCompose(null);
          void tableItem.put({ kind: 'quiz', question, answers, correct }, { revealed: false });
        }}
      />
      <TableOptionsSheet
        visible={tableOptionsOpen}
        canTakeOff={tableItem.canTakeOff}
        onClose={() => setTableOptionsOpen(false)}
        onTakeOff={() => {
          setTableOptionsOpen(false);
          tableItem.takeOff();
        }}
        onReport={() => {
          setTableOptionsOpen(false);
          const item = tableItem.item;
          setReportPerson(item && !tableItem.mine ? { id: item.by, nickname: item.byName } : null);
          setTimeout(() => setReportOpen(true), motion.slow);
        }}
      />
      <ChatSheet
        visible={chatOpen && connected}
        messages={chat}
        onClose={() => setChatOpen(false)}
        pausedReason={chatPaused}
        onSend={voice.sendChat}
        onPerson={(p) => {
          setChatOpen(false);
          setProfileFromChat(true);
          // Let the chat slide away first: two sheets can't swap in the same moment on every phone.
          setTimeout(() => openProfile(p), motion.slow);
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
function RowButton({
  Icon,
  label,
  onPress,
  badge = 0,
  active = false,
  disabled = false,
}: {
  Icon: typeof LogOut;
  label: string;
  onPress: () => void;
  // On, like a raised hand: ember badge colours (design direction › emberSoft / emberText).
  active?: boolean;
  // Raise hand while you're already talking: nothing to ask for.
  disabled?: boolean;
  // A small count in the corner, e.g. unread chat messages.
  badge?: number;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${label}, ${badge} new` : label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        height: size.buttonPrimary,
        borderRadius: radius.card,
        backgroundColor: active ? colors.emberSoft : colors.surface,
        opacity: disabled ? opacity.disabled : 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
      }}
    >
      <Icon size={size.icon} color={active ? colors.emberText : colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="tiny" color={active ? 'emberText' : 'textSoft'}>
        {label}
      </Text>
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: space[1],
            right: space[2],
            minWidth: size.avatarBadge,
            height: size.avatarBadge,
            paddingHorizontal: space[1],
            borderRadius: radius.pill,
            backgroundColor: colors.emberSoft,
            borderWidth: border.seatRing,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="tiny" color="emberText">
            {badge > 9 ? '9+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
