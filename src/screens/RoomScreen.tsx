import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Dice5, MoreHorizontal, Flag, Hand, Hash, Heart, Mic, MicOff, SquarePlus, LogOut, MessageCircle, Shield, X } from 'lucide-react-native';
import { Avatar } from '../components/Avatar';
import { BlockSheet } from '../components/BlockSheet';
import { InviteSheet } from '../components/InviteSheet';
import { setInRoom } from '../lib/reminders';
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
import { RoomRulesSheet } from '../components/RoomRulesSheet';
import { Text } from '../components/Text';
import { Toast } from '../components/Toast';
import { BASE, MIN_PLAYERS as LUDO_MIN, teamOf } from '../games/ludo/engine';
import { BackFromGame, GameModeProvider, GameStage, type GameModeEnv } from '../games/mode/GameMode';
import { GAME_TITLE } from '../games/mode/howToPlay';
import { TableAction } from '../components/TableAction';
import { LudoTable } from '../games/ludo/LudoTable';
import { useLudo } from '../games/ludo/useLudo';
import { ImpostorTable } from '../games/impostor/ImpostorTable';
import { MIN_PLAYERS as IMPOSTOR_MIN, ROUNDS_PER_GAME } from '../games/impostor/logic';
import { useImpostor } from '../games/impostor/useImpostor';
import { NoteSheet, QuizSheet, TurnsSheet, VideoSheet, WordsSheet } from '../components/table/ComposeSheets';
import { WordsBody } from '../components/table/WordsBody';
import { DraughtsBody } from '../games/draughts/DraughtsBody';
import { ChessBody } from '../games/chess/ChessBody';
import { WhotBody } from '../games/whot/WhotBody';
import { MafiaBody } from '../games/mafia/MafiaBody';
import { NIGHT_SECONDS, type MafiaPublic, type MafiaSecret } from '../games/mafia/engine';
import type { WhotPublic } from '../games/whot/engine';
import type { ChessGame } from '../games/chess/engine';
import type { DraughtsGame } from '../games/draughts/engine';
import { GAME_IDS, type GameId, type Side } from '../games/tableGame';
import { SCORED_GAMES, firstSide, newScore, replayPlan, type ScoreGame } from '../games/score';
import { ScoreSheet } from '../games/mode/ScoreSheet';
import { GAMES } from '../games/registry';
import { AppealSheet, HandsSheet, HostActionsSheet, REMOVAL_REASONS, RemoveSheet } from '../components/host/HostSheets';
import { utf8Decode, utf8Encode } from '../rooms/chat';
import { appealRemoval, hostAction, type RemovalReason } from '../rooms/api';
import { submitReport } from '../lib/safety';
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
import type { Person } from '../voice/useVoiceRoom';
import { MOOD_STYLE } from '../rooms/moods';
import { levelLabel } from '../rooms/learn';
import { topicLabel } from '../rooms/start';
import { clock, roomPhase, secondsLeft } from '../rooms/phase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HostCardSheet, RequestSheet } from '../components/support/HostCardSheet';
import { OneOnOneError, hostCard, hostName, myRequest, requestOneOnOne, type HostCard } from '../support/api';
import { micPermissionGranted, requestMicPermission } from '../voice/foregroundService';
import { useVoiceRoom, type RoomSummary } from '../voice/useVoiceRoom';
import { border, gameMode, motion, opacity, radius, size, space, useColors } from '../theme';

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
  // Minimised: a small bar above the tabs while you browse; voice stays on.
  minimised: boolean;
  onMinimise: () => void;
  onExpand: () => void;
  // Whether ⌄ and Android's back can minimise right now (only while connected).
  onCanMinimise: (can: boolean) => void;
};

export function RoomScreen({ me, request, onLeft, onMove, minimised, onMinimise, onExpand, onCanMinimise }: Props) {
  const colors = useColors();
  const voice = useVoiceRoom();
  const { status, room, people } = voice;
  // Invitation alerts stay quiet while you're here.
  useEffect(() => {
    setInRoom(true);
    return () => setInRoom(false);
  }, []);
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
  const oneOnOne = !!room?.oneOnOne;
  const freshPhase = status === 'connected' ? roomPhase({ count: people.length, everLive, isSupport, hostPresent, oneOnOne }) : null;
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
  const [compose, setCompose] = useState<'note' | 'video' | 'turns' | 'quiz' | 'words' | null>(null);
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

  // --- room rules: 2 people to talk (3 in support rooms); a countdown when a live room drops below ---
  useEffect(() => {
    if (phase === 'live') setEverLive(true);
    // A one-on-one never closes early: the other person can come back until the time is up.
    if (phase === 'countdown' && !room?.oneOnOne) {
      setCountdownFrom((from) => {
        if (from !== null) return from;
        setNow(Date.now());
        return Date.now();
      });
    } else setCountdownFrom(null);
    // Mics are paused whenever the room isn't live.
    if (phase && phase !== 'live' && micLive) void voice.setMic(false);
  }, [phase, micLive, voice.setMic, room?.oneOnOne]);

  useEffect(() => {
    if (countdownFrom === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [countdownFrom]);

  // Only ever leaves once, however many things ask at the same moment (Leave, the countdown ending).
  // A one-on-one ends gently when its time is up: a note 2 minutes before, then the room closes for both.
  const endsAt = room?.endsAt ? Date.parse(room.endsAt) : null;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const warned = useRef(false);
  const leaveRoom = useCallback(async () => {
    if (left.current) return;
    left.current = true;
    setCountdownFrom(null);
    ludo.leaveGame();
    const summary = (await voice.leave()) ?? voice.lastSummary;
    onLeft(summary);
  }, [voice, onLeft, ludo]);
  useEffect(() => {
    if (!endsAt || !connected) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 120 && left > 0 && !warned.current) {
        warned.current = true;
        setToast('2 minutes left.');
      }
      if (left === 0) void leaveRoom();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt, connected, leaveRoom]);

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
    onMove({
      kind: 'match',
      door: room.door,
      mood: room.mood,
      excludeRoomId: room.id,
      ...(room.door === 'learn' && room.language && room.level ? { language: room.language, level: room.level } : {}),
    });
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

  // Mafia's night: everyone's mic is paused, at most 20 seconds, and the screen says why (activities.md ›
  // pausesMics). It never mutes anyone outside the night. Each phone lifts the pause on its own clock
  // a moment after the night should end, even if the narrator's phone goes quiet.
  const mafiaG =
    tableItem.item?.kind === 'game' && tableItem.item.game === 'mafia' ? (tableItem.state.g as MafiaPublic | undefined) : undefined;
  const nightKey = mafiaG?.phase === 'night' && tableItem.item ? `${tableItem.item.id}-${mafiaG.round}` : null;
  const [nightOver, setNightOver] = useState<string | null>(null);
  useEffect(() => {
    if (!nightKey || !mafiaG) return;
    const ms = Math.min(Math.max(0, mafiaG.endsAt - mafiaG.sentAt), NIGHT_SECONDS * 1000) + 2000;
    const timer = setTimeout(() => setNightOver(nightKey), ms);
    return () => clearTimeout(timer);
    // Worked out once per night, from the first message about it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightKey]);
  const mafiaNight = !!nightKey && nightOver !== nightKey;
  const micState: MicState =
    (phase && phase !== 'live') || mafiaNight
      ? 'paused'
      : !micAllowed
        ? micDenied
          ? 'blocked'
          : 'notAllowed'
        : micLive
          ? 'live'
          : 'muted';
  const pausedReason = mafiaNight
    ? 'Night: the Mafia is choosing'
    : isSupport && !hostPresent
      ? 'Waiting for a host'
      : isSupport
        ? phase === 'countdown'
          ? 'Finding a third person'
          : 'Support rooms need three people'
        : 'You can talk once someone joins';
  // Paused isn't a dead button: tapping it says why.
  const micPress = () => (micState === 'paused' ? setToast(`Mic paused. ${pausedReason}.`) : void onMicPress());
  // People whose mic the night paused are told when they can talk again.
  const pausedByNight = useRef(false);
  useEffect(() => {
    if (mafiaNight && micLive) {
      pausedByNight.current = true;
      void voice.setMic(false);
    }
    if (!mafiaNight && pausedByNight.current) {
      pausedByNight.current = false;
      setToast('Night is over. Tap the mic to talk.');
    }
  }, [mafiaNight, micLive, voice.setMic]);

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
  // Chat follows the same rule as the mics: nothing new until the room is live (two people; three and
  // a trained host in support rooms).
  const chatPaused =
    phase === 'live'
      ? null
      : isSupport && !hostPresent
        ? 'Chat is paused until a trained host is here.'
        : isSupport
          ? 'Chat opens when three people are here.'
          : 'Chat opens when someone joins.';
  // Tapping a name in chat opens their profile; closing it goes back to the chat.
  const [profileFromChat, setProfileFromChat] = useState(false);

  // --- what to show ---
  const { joinMs, firstVoiceMs, quality } = voice.numbers;
  const mood = room?.mood ? MOOD_STYLE[room.mood] : null;
  const topic = topicLabel(room?.topic) ?? (room?.door === 'learn' ? levelLabel(room.level) : null);
  // During Find the Impostor the header shows the game and the round (docs/screens/12).
  const impostorOn = connected && room?.door === 'play' && phase === 'live' && !ludo.game && !!impostor.round;
  // Matched game rooms are all called "Let's play" (the door's name), so say which game instead.
  const gameName =
    tableItem.item?.kind === 'game' ? GAMES[tableItem.item.game]?.name : ludo.game ? 'Ludo' : wantedGameName(request);
  const title = impostorOn
    ? 'Find the Impostor'
    : room?.door === 'play' && room.title === "Let's play"
      ? gameName
        ? `${gameName} room`
        : 'Game room'
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
  } else if (status === 'notYet') {
    message = { title: "This room isn't open yet", body: 'It opens 5 minutes before it starts. Try again then.' };
  } else if (status === 'paused') {
    message = { title: 'Your account is paused', body: 'You can’t join rooms right now.' };
  } else if (status === 'error') {
    message = { title: "We couldn't get you into a room", body: "Check that you're online, then try again." };
  } else if (status === 'dropped') {
    message = { title: 'You were disconnected', body: 'Your connection dropped. You can join again.' };
  } else if (phase === 'waiting' && oneOnOne) {
    message = { title: 'Your one-on-one', body: "It starts when you're both here. Only the two of you can come in." };
  } else if (phase === 'countdown' && oneOnOne) {
    message = { title: 'The other person has left', body: 'Mics are paused. They can come back until the time is up.' };
  } else if (phase === 'waiting') {
    message = isSupport
      ? hostPresent
        ? { title: 'A quiet room is opening', body: 'It starts when three people are here. Mics stay off until then.' }
        : { title: 'Waiting for a host', body: 'Support rooms always have a trained host. Mics stay off until one is here.' }
      : // Said once, in the circle ("Waiting for players · 1 of 6"); Invite friends is the thing to do.
        null;
  } else if (phase === 'countdown') {
    message =
      isSupport && !hostPresent
        ? { title: 'Your host has left', body: 'Support rooms need a trained host, so mics are paused for now.' }
        : isSupport
          ? { title: 'Finding a third person', body: 'Support rooms need three people, so mics are paused for now.' }
          : { title: 'Waiting for someone to join', body: 'Everyone else has left, so mics are paused for now.' };
  }

  const game = ludo.game;
  const round = impostor.round;
  const everyone = people.map((p) => p.id);
  const openProfile = (p: { id: string; nickname: string }) => setProfile({ id: p.id, nickname: p.nickname });
  // A trained host tapping someone gets the host actions; everyone else gets save, block and report.
  const onSeat = (p: Person) => {
    if (iAmHost && !p.isHost && !p.isMe) setHostPerson(p);
    // A host in a support room: their card, where you can ask for one-on-one.
    else if (isSupport && p.isHost && !p.isMe && !oneOnOne) {
      void hostCard(p.id)
        .then((c) => (c ? setHostCardShown(c) : setProfile({ id: p.id, nickname: p.nickname, isHost: true })))
        .catch(() => setProfile({ id: p.id, nickname: p.nickname, isHost: true }));
    } else setProfile({ id: p.id, nickname: p.nickname, isHost: p.isHost });
  };
  let table = null;

  // --- trained hosts: hands, mute, remove (room-host-view.md) ---
  const iAmHost = people.some((p) => p.isMe && p.isHost);
  const hands = others.filter((p) => p.handUp).sort((a, b) => a.handAt - b.handAt);
  const [handsOpen, setHandsOpen] = useState(false);
  const [hostPerson, setHostPerson] = useState<Person | null>(null);
  const [hostCardShown, setHostCardShown] = useState<HostCard | null>(null);
  // The ⋯ menu at the top: room info, invite, rules, help.
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [askingHost, setAskingHost] = useState<HostCard | null>(null);
  // A one-on-one asked for from this room: checked every few seconds until there's an answer.
  const [askedId, setAskedId] = useState<string | null>(null);
  useEffect(() => {
    if (!askedId) return;
    const timer = setInterval(() => {
      void myRequest(askedId)
        .then((r) => {
          if (!r || r.status === 'pending') return;
          setAskedId(null);
          void AsyncStorage.removeItem('circles.oneOnOne').catch(() => {});
          if (r.status === 'accepted' && r.roomId) onMove({ kind: 'join', roomId: r.roomId, oneOnOneId: askedId });
          else if (r.status === 'declined' || r.status === 'expired') setToast(`${r.hostNickname} isn't available right now.`);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [askedId, onMove]);
  const [removePerson, setRemovePerson] = useState<Person | null>(null);
  const [removedFor, setRemovedFor] = useState<RemovalReason | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);

  // What the host's actions tell the person, sent only to them, and believed only from a trained host.
  const peopleNow = useRef(people);
  peopleNow.current = people;
  useEffect(() => {
    if (!connected) return;
    return voice.onData('host', (payload, from) => {
      if (!peopleNow.current.some((p) => p.id === from.id && p.isHost)) return;
      let msg: { k?: string; reason?: string };
      try {
        msg = JSON.parse(utf8Decode(payload)) as { k?: string; reason?: string };
      } catch {
        return;
      }
      if (msg.k === 'letin') setToast('You can talk now. Unmute when you’re ready.');
      else if (msg.k === 'lowered') setToast('The host lowered your hand. You can raise it again later.');
      else if (msg.k === 'muted') setToast('The host muted you. You can unmute when it’s your turn.');
      else if (msg.k === 'removed' && REMOVAL_REASONS.some((r) => r.id === msg.reason)) setRemovedFor(msg.reason as RemovalReason);
      // A host thinks you may be in danger: the help options open straight away.
      else if (msg.k === 'escalate') setHelpOpen(true);
    });
  }, [connected, voice.onData]);

  const tellPerson = (p: Person, msg: { k: string; reason?: string }) =>
    voice.publishData('host', utf8Encode(JSON.stringify(msg)), [p.id]);

  async function doHost(p: Person, act: 'letin' | 'notnow' | 'mute' | 'remove' | 'escalate', reason?: RemovalReason, alsoReport?: boolean) {
    if (!room) return;
    try {
      if (act === 'escalate') {
        await tellPerson(p, { k: 'escalate' });
        await hostAction(room.id, p.id, 'escalate');
        setToast(`The help options are open on ${p.nickname}'s phone, and the team knows. Stay with them.`);
      } else if (act === 'letin' || act === 'notnow') {
        await hostAction(room.id, p.id, 'lower');
        await tellPerson(p, { k: act === 'letin' ? 'letin' : 'lowered' });
        setToast(act === 'letin' ? `${p.nickname} can talk now.` : `${p.nickname}'s hand is down.`);
      } else if (act === 'mute') {
        await hostAction(room.id, p.id, 'mute');
        await tellPerson(p, { k: 'muted' });
        setToast(`${p.nickname} muted.`);
      } else if (reason) {
        // They hear why before they're taken out.
        await tellPerson(p, { k: 'removed', reason });
        await hostAction(room.id, p.id, 'remove', reason);
        setToast(`${p.nickname} was removed from this room.`);
        if (alsoReport) {
          const asReport = reason === 'sexual' ? 'sexual' : reason === 'unkind' ? 'hate' : reason === 'spam' ? 'scam' : 'other';
          const why = REMOVAL_REASONS.find((r) => r.id === reason)?.title ?? reason;
          await submitReport({ id: p.id, nickname: p.nickname }, room.id, asReport, `Removed from the room by a host for: ${why}`).catch(() => {});
        }
      }
    } catch {
      setToast("That didn't work. Check your connection.");
    }
  }

  // --- the table: open it, put something on it, replace your own ---
  function openTable() {
    if (phase !== 'live') {
      setToast(
        isSupport && !hostPresent
          ? 'The table opens when a trained host is here.'
          : isSupport
            ? 'The table opens when three people are here.'
            : 'The table opens when someone joins.',
      );
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

  // Rooms go live at 2, but Find the Impostor needs 3.
  function impostorTooFew() {
    setToast(`Find the Impostor needs at least ${IMPOSTOR_MIN} people.`);
  }

  // Starts a Table game when there are enough people for it. `keep` carries the score on (and the
  // teams), for Play again.
  function playTableGame(id: GameId, keep: Parameters<typeof tableItem.startGame>[1] = {}) {
    const engine = GAMES[id];
    if (engine && people.length < engine.min) {
      setToast(id === 'mafia' ? 'Mafia needs at least 5 people: a narrator and 4 players.' : `${engine.name} needs at least ${engine.min} people.`);
      return;
    }
    void tableItem.startGame(id, keep);
  }

  // --- the score for this sitting (src/games/score.ts): asked once, then carried on by Play again ---
  const [scoreAsk, setScoreAsk] = useState<ScoreGame | null>(null);
  function startScored(game: ScoreGame, target: number | null) {
    setScoreAsk(null);
    const set = newScore(game, target);
    if (tableItem.item) tableItem.takeOff();
    if (game === 'ludo') ludo.start(everyone, { set });
    else playTableGame(game, { set });
  }
  // Play again: the same teams and the score carried on (src/games/score.ts › replayPlan). With
  // `fresh`, new teams and a new score.
  function replayTableGame(id: GameId, fresh = false) {
    const set = tableItem.state.set;
    if (!set) return playTableGame(id);
    const g = tableItem.state.g as { teams?: Record<Side, string[]> } | undefined;
    const plan = replayPlan({ score: set, teams: g?.teams, here: everyone, max: GAMES[id]?.max ?? everyone.length, fresh });
    if (plan.mixed) setToast('A team had nobody left, so the teams were mixed again and the score starts over.');
    playTableGame(id, { set: plan.score, teams: plan.teams, first: firstSide(plan.score) });
  }
  function replayLudo(fresh = false) {
    const g = ludo.game;
    if (!g?.set) return ludo.start(everyone);
    const plan = replayPlan({ score: g.set, teams: g.teams, here: everyone, max: everyone.length, fresh });
    if (plan.mixed) setToast('A team had nobody left, so the teams were mixed again and the score starts over.');
    ludo.start(everyone, { set: plan.score, teams: plan.teams, first: firstSide(plan.score) });
  }

  function onTablePick(choice: TableChoice) {
    setPutOpen(false);
    confirmReplace(() => {
      if (GAME_IDS.includes(choice as GameId)) {
        const engine = GAMES[choice as GameId];
        if (engine && people.length < engine.min) {
          playTableGame(choice as GameId);
          return;
        }
        // Games with a score ask how to keep it first.
        if (SCORED_GAMES.includes(choice as ScoreGame)) {
          setTimeout(() => setScoreAsk(choice as ScoreGame), motion.slow);
          return;
        }
        if (tableItem.item) tableItem.takeOff();
        void tableItem.startGame(choice as GameId);
      } else if (choice === 'ludo' || choice === 'impostor') {
        // Say so instead of clearing the table for nothing.
        if (choice === 'impostor' && people.length < IMPOSTOR_MIN) {
          impostorTooFew();
          return;
        }
        if (choice === 'ludo') {
          setTimeout(() => setScoreAsk('ludo'), motion.slow);
          return;
        }
        if (tableItem.item) tableItem.takeOff();
        setWordHidden(false);
        impostor.startGame(everyone);
      } else if (choice === 'note' || choice === 'video' || choice === 'turns' || choice === 'quiz' || choice === 'words') {
        setTimeout(() => setCompose(choice), motion.slow);
      } else if (choice === 'photos') {
        setTimeout(() => void putPhotos(), motion.slow);
      } else if (choice === 'screen') {
        setTimeout(confirmScreenShare, motion.slow);
      }
    });
  }

  // Came in by tapping a game on Let's play: start it once the room is live with enough people and the
  // table has stayed free long enough to hear from anyone already presenting (useTable's hello).
  // Anything already on the table wins, and the wish is dropped.
  const wantedGame = useRef(request.kind === 'match' ? request.game : undefined);
  const toldWait = useRef(false);
  useEffect(() => {
    const game = wantedGame.current;
    if (!game || !ludo.ready || !impostor.ready) return;
    // Ludo and Find the Impostor aren't table items, so they're checked as well.
    if (tableItem.item || ludo.game || impostor.round) {
      wantedGame.current = undefined;
      return;
    }
    if (phase !== 'live') return;
    const engine = game === 'impostor' || game === 'ludo' ? null : GAMES[game];
    const min = engine ? engine.min : game === 'impostor' ? IMPOSTOR_MIN : LUDO_MIN;
    if (people.length < min) {
      const name = engine ? engine.name : game === 'impostor' ? 'Find the Impostor' : 'Ludo';
      if (!toldWait.current) setToast(`${name} starts when ${min} people are here.`);
      toldWait.current = true;
      return;
    }
    const timer = setTimeout(() => {
      wantedGame.current = undefined;
      onTablePick(game);
    }, 3500);
    return () => clearTimeout(timer);
    // onTablePick is rebuilt every render; these are what decide when to start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, people.length, tableItem.item, ludo.ready, ludo.game, impostor.ready, impostor.round]);

  // Games on the table take the whole screen instead (game mode, below).
  if (!table && connected && phase === 'live' && tableItem.item && tableItem.item.kind !== 'game') {
    const item = tableItem.item;
    table = (
      <View style={{ gap: space[4] }}>
        <SeatRow people={people} onPerson={onSeat} />
        <TableCard item={item} me={me.id} onOptions={() => setTableOptionsOpen(true)}>
          {item.kind === 'note' ? <NoteBody item={item} /> : null}
          {item.kind === 'words' ? (
            <WordsBody key={item.id} item={item} state={tableItem.state} mine={tableItem.mine} onPresent={tableItem.present} />
          ) : null}
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

  // Games have their own Leave game, End game and Stop watching, in game mode's ⋯ menu.
  let tableAction = null;
  // In game rooms the table is mostly games, so it says so.
  if (!tableAction && connected)
    tableAction =
      room?.door === 'play' ? (
        <RowButton Icon={Dice5} label="Games" onPress={openTable} />
      ) : (
        <RowButton Icon={SquarePlus} label="Table" onPress={openTable} />
      );

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
    // The room stopped being live (it dropped below its minimum): the table hides, so a shared screen stops.
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
  const handButton = (
    <RowButton
      Icon={Hand}
      label={handUp ? 'Lower hand' : 'Raise hand'}
      active={handUp}
      disabled={(micLive || others.length === 0) && !handUp}
      onPress={() => void toggleHand()}
    />
  );

  // Invite: your people (mutual saves) get an invitation in Groups; once the web version is online, a
  // link can be shared too. Never in support rooms (CLAUDE.md, Never list).
  const canInvite = connected && !!room && room.door !== 'support';
  const [inviteOpen, setInviteOpen] = useState(false);
  const invite = () => setInviteOpen(true);
  const shareLink = async () => {
    if (!room || !WEB_URL) return;
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

  // You just started an invite-only room: the invite sheet opens once, so you can ask your people in.
  const autoInvited = useRef(false);
  useEffect(() => {
    if (!canInvite || autoInvited.current || request.kind !== 'create' || !request.private) return;
    autoInvited.current = true;
    invite();
  });

  // --- game mode: a game takes the whole screen (docs/design/pages/game-mode.md) ---
  // A Ludo or Find the Impostor game this phone stepped out of (Leave game, Stop watching).
  const [steppedOut, setSteppedOut] = useState<string | null>(null);
  const ludoGame = connected && isPlay && phase === 'live' && game && steppedOut !== game.id ? game : null;
  const impostorRound = connected && isPlay && phase === 'live' && !ludoGame && round && steppedOut !== round.gameId ? round : null;
  // Games only ever in play rooms, never in support rooms (CLAUDE.md, Never list).
  const tableGame =
    connected && isPlay && phase === 'live' && !ludoGame && !impostorRound && tableItem.item?.kind === 'game' ? tableItem.item : null;
  // "That move didn't go through. Try again." under the board, for a few seconds.
  const failedAt = Math.max(tableItem.moveFailedAt, ludo.failedAt);
  const [failNote, setFailNote] = useState(false);
  useEffect(() => {
    if (!failedAt) return;
    setFailNote(true);
    const t = setTimeout(() => setFailNote(false), gameMode.moveTimeoutMs);
    return () => clearTimeout(t);
  }, [failedAt]);

  let gameView: ReactNode = null;
  let exit: GameModeEnv['exit'] = null;
  if (ludoGame) {
    const playing = !!teamOf(ludoGame, me.id);
    const starterHere = people.some((p) => p.id === ludoGame.startedBy);
    exit =
      ludoGame.startedBy === me.id || !starterHere
        ? { label: 'End game', onPress: ludo.endGame }
        : playing
          ? { label: 'Leave game', onPress: () => { ludo.leaveGame(); setSteppedOut(ludoGame.id); } }
          : { label: 'Stop watching', onPress: () => setSteppedOut(ludoGame.id) };
    gameView = (
      <LudoTable
        state={ludoGame}
        me={me.id}
        pending={ludo.pending}
        rollingSince={ludo.rollingSince}
        onRolled={ludo.rolled}
        onRoll={ludo.roll}
        onMove={ludo.move}
        onBringOut={() => {
          const first = ludoGame.tokens[ludoGame.turn].findIndex((pos) => pos === BASE);
          if (first >= 0) ludo.move(first);
        }}
        canRestart={ludoGame.startedBy === me.id || !starterHere}
        onPlayAgain={() => replayLudo()}
        onFresh={ludoGame.set ? () => replayLudo(true) : undefined}
        onBackToTalking={ludoGame.startedBy === me.id || !starterHere ? ludo.endGame : () => setSteppedOut(ludoGame.id)}
      />
    );
  } else if (impostorRound) {
    const starterHere = people.some((p) => p.id === impostorRound.startedBy);
    exit =
      impostorRound.startedBy === me.id || !starterHere
        ? { label: 'End game', onPress: impostor.endGame }
        : { label: impostor.playing ? 'Leave game' : 'Stop watching', onPress: () => setSteppedOut(impostorRound.gameId) };
    gameView = (
      <ImpostorTable
        round={impostorRound}
        now={impostor.now}
        me={me.id}
        people={people}
        playing={impostor.playing}
        card={impostor.card}
        hidden={wordHidden}
        onShowWord={() => setWordHidden(false)}
        onHideWord={() => setWordHidden(true)}
        myVote={impostor.myVote}
        outcome={impostor.outcome}
        onVote={(id) => void impostor.castVote(id)}
        onNextRound={() => (people.length < IMPOSTOR_MIN ? impostorTooFew() : impostor.nextRound(everyone))}
        onPlayAgain={() => (people.length < IMPOSTOR_MIN ? impostorTooFew() : impostor.startGame(everyone))}
        starter={impostorRound.startedBy === me.id || !starterHere}
        onBackToTalking={impostorRound.startedBy === me.id || !starterHere ? impostor.endGame : () => setSteppedOut(impostorRound.gameId)}
        busy={impostor.busy}
      />
    );
  } else if (tableGame) {
    const where = tableGameStatus(tableGame.game, tableItem.state.g, me.id);
    exit = tableItem.canTakeOff
      ? { label: 'End game', onPress: tableItem.takeOff }
      : where === 'playing'
        ? { label: 'Leave game', onPress: tableItem.leaveGame }
        : { label: where === 'watching' ? 'Stop watching' : 'Close', onPress: tableItem.hideItem };
    const g = tableItem.state.g;
    const common = {
      gameKey: tableGame.id,
      me: me.id,
      people,
      starter: tableItem.mine,
      onPlayAgain: () => replayTableGame(tableGame.game),
      onBackToTalking: tableItem.mine ? tableItem.takeOff : tableItem.hideItem,
    };
    // The score for the sitting: Draughts, Chess and Whot only (src/games/score.ts).
    const scored = {
      score: tableItem.state.set,
      onFresh: tableItem.state.set ? () => replayTableGame(tableGame.game, true) : undefined,
    };
    gameView = !g ? (
      // After a reconnect, until the starter's phone sends the game again.
      <GameStage kind={tableGame.game} gameKey={tableGame.id} turn={{ text: GAME_TITLE[tableGame.game] }} board={() => null} note="Getting the game back…" />
    ) : tableGame.game === 'draughts' ? (
      <DraughtsBody g={g as DraughtsGame} pending={tableItem.movePending} onMove={tableItem.sendMove} {...common} {...scored} />
    ) : tableGame.game === 'chess' ? (
      <ChessBody g={g as ChessGame} pending={tableItem.movePending} onMove={tableItem.sendMove} {...common} {...scored} />
    ) : tableGame.game === 'whot' ? (
      <WhotBody
        g={g as WhotPublic}
        hand={Array.isArray(tableItem.mySecret) ? (tableItem.mySecret as string[]) : null}
        pending={tableItem.movePending}
        onMove={tableItem.sendMove}
        {...common}
        {...scored}
      />
    ) : (
      <MafiaBody g={g as MafiaPublic} secret={(tableItem.mySecret as MafiaSecret | null) ?? null} onMove={tableItem.sendMove} {...common} />
    );
  } else if (connected && phase === 'live' && tableItem.endedBy) {
    const ended = tableItem.endedBy;
    gameView = (
      <GameStage
        kind={ended.game}
        gameKey={`ended-${ended.game}`}
        turn={{ text: 'Game over' }}
        board={({ width }) => (
          <View style={{ width, gap: space[4] }} accessibilityLiveRegion="polite">
            <Text variant="title" center>{`The game ended because ${ended.name} left.`}</Text>
            <TableAction label="Back to the room" onPress={tableItem.clearEnded} />
          </View>
        )}
      />
    );
  }
  const gameEnv: GameModeEnv = {
    people,
    mic: <MicControl state={micState} pausedReason={pausedReason} onPress={micPress} />,
    unread,
    onChat: () => setChatOpen(true),
    onPerson: onSeat,
    exit,
    onLeaveRoom: () => void leaveRoom(),
    reconnecting: status === 'reconnecting',
    note: failNote ? "That move didn't go through. Try again." : null,
    above: (
      <>
        <Toast message={toast} onDone={clearToast} />
        {voice.audioBlocked ? <Button label="Turn on sound" onPress={() => void voice.unblockAudio()} /> : null}
      </>
    ),
  };
  // When a game ends on this phone, the room circle eases back in.
  const inGameMode = !!gameView;
  const wasInGameMode = useRef(inGameMode);
  const [backFromGame, setBackFromGame] = useState(0);
  useEffect(() => {
    if (wasInGameMode.current && !inGameMode) setBackFromGame((n) => n + 1);
    wasInGameMode.current = inGameMode;
  }, [inGameMode]);

  // A game still going that this phone stepped out of: a quiet way back in.
  const backToGame =
    connected && phase === 'live' && !gameView
      ? game && !game.winner && steppedOut === game.id
        ? () => setSteppedOut(null)
        : round && !impostor.outcome && steppedOut === round.gameId
          ? () => setSteppedOut(null)
          : tableItem.hiddenGame
            ? tableItem.unhide
            : null
      : null;

  // Sheets and dialogs, the same in the room and in game mode.
  const sheets = (
    <>
      <ScoreSheet game={scoreAsk} onClose={() => setScoreAsk(null)} onStart={(target) => scoreAsk && startScored(scoreAsk, target)} />
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
      {canInvite && room ? (
        <InviteSheet
          visible={inviteOpen}
          target={{ roomId: room.id }}
          title={room.title}
          onClose={() => setInviteOpen(false)}
          onSent={(note) => {
            setInviteOpen(false);
            setToast(note);
          }}
          onShareLink={
            WEB_URL
              ? () => {
                  setInviteOpen(false);
                  void shareLink();
                }
              : undefined
          }
        />
      ) : null}
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
          peopleCount={people.length}
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
      <HandsSheet
        visible={handsOpen}
        hands={hands}
        onClose={() => setHandsOpen(false)}
        onLetIn={(p) => void doHost(p, 'letin')}
        onNotNow={(p) => void doHost(p, 'notnow')}
      />
      <HostActionsSheet
        person={hostPerson}
        onClose={() => setHostPerson(null)}
        onMute={(p) => {
          setHostPerson(null);
          void doHost(p, 'mute');
        }}
        onRemove={(p) => {
          setHostPerson(null);
          setTimeout(() => setRemovePerson(p), motion.slow);
        }}
        onMore={(p) => {
          setHostPerson(null);
          setTimeout(() => setProfile({ id: p.id, nickname: p.nickname }), motion.slow);
        }}
        onDanger={
          isSupport
            ? (p) => {
                setHostPerson(null);
                void doHost(p, 'escalate');
              }
            : undefined
        }
      />
      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View style={{ gap: space[1] }}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="meta" color="textSoft">
            {`${people.length} of ${room?.capacity ?? people.length} here.${isSupport ? " Nobody sees you're here." : ''}`}
          </Text>
        </View>
        <View style={{ gap: space[3] }}>
          {canInvite ? (
            <Button
              label="Invite someone"
              onPress={() => {
                setMenuOpen(false);
                setTimeout(invite, motion.slow);
              }}
            />
          ) : null}
          <Button
            label="Room rules"
            onPress={() => {
              setMenuOpen(false);
              setTimeout(() => setRulesOpen(true), motion.slow);
            }}
          />
          <Button
            label="Get help"
            onPress={() => {
              setMenuOpen(false);
              setTimeout(onOpenHelp, motion.slow);
            }}
          />
          <Button label="Close" variant="quiet" onPress={() => setMenuOpen(false)} />
        </View>
      </Sheet>
      <RoomRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
      <HostCardSheet
        card={hostCardShown}
        onClose={() => setHostCardShown(null)}
        onRequest={(c) => {
          setHostCardShown(null);
          setTimeout(() => setAskingHost(c), motion.slow);
        }}
        onReport={(c) => {
          setHostCardShown(null);
          setTimeout(() => setProfile({ id: c.userId, nickname: c.nickname, isHost: true }), motion.slow);
        }}
      />
      <RequestSheet
        card={askingHost}
        busy={false}
        onClose={() => setAskingHost(null)}
        onConfirm={(c) => {
          setAskingHost(null);
          void requestOneOnOne(c.userId)
            .then((id) => {
              void AsyncStorage.setItem('circles.oneOnOne', id).catch(() => {});
              setAskedId(id);
              setToast(`Asked ${hostName(c)}. If they say yes, you'll go straight to your one-on-one.`);
            })
            .catch((e) =>
              setToast(
                e instanceof OneOnOneError && e.code === 'payment_needed'
                  ? "Paying in the app is coming soon, so paid sessions can't be booked yet."
                  : e instanceof OneOnOneError && e.code === 'already_waiting'
                    ? "You're already waiting for an answer."
                    : `${hostName(c)} isn't available right now.`,
              ),
            );
        }}
      />
      <RemoveSheet
        person={removePerson}
        onClose={() => setRemovePerson(null)}
        onRemove={(p, reason, alsoReport) => {
          setRemovePerson(null);
          void doHost(p, 'remove', reason, alsoReport);
        }}
      />
      <AppealSheet
        visible={appealOpen}
        onClose={() => setAppealOpen(false)}
        onSend={(text) => {
          setAppealOpen(false);
          if (room)
            void appealRemoval(room.id, text)
              .then(() => setToast('Sent to the Circles team. Thank you.'))
              .catch(() => setToast("That didn't send. Check your connection."));
        }}
      />
      <TurnsSheet
        visible={compose === 'turns'}
        onClose={() => setCompose(null)}
        onPut={(topic, minutes) => {
          setCompose(null);
          // Everyone here, starting with you; people who arrive later join the end.
          const order = [me.id, ...people.filter((p) => !p.isMe).map((p) => p.id)];
          void tableItem.put({ kind: 'turns', topic, minutes }, { order: order.slice(0, 12), index: 0, startedAt: Date.now(), sentAt: Date.now() });
        }}
      />
      <WordsSheet
        visible={compose === 'words'}
        onClose={() => setCompose(null)}
        onPut={(words) => {
          setCompose(null);
          void tableItem.put({ kind: 'words', words }, { index: 0 });
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
    </>
  );

  // Minimised and something changed that needs you (removed, the room ended, the connection dropped):
  // open the room again so you see it.
  const needsYou = (!connected && status !== 'connecting') || phase === 'countdown';
  useEffect(() => {
    if (minimised && needsYou) onExpand();
  }, [minimised, needsYou, onExpand]);
  useEffect(() => {
    onCanMinimise(connected);
  }, [connected, onCanMinimise]);

  if (minimised) {
    return (
      <MiniRoomBar
        title={title}
        here={people.length}
        mic={micState}
        onOpen={onExpand}
        onMic={() => void onMicPress()}
      />
    );
  }

  if (gameView) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <GameModeProvider value={gameEnv}>{gameView}</GameModeProvider>
        {sheets}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[1],
          paddingHorizontal: space.gutter,
          minHeight: size.minTarget,
        }}
      >
        {/* Rooms: ⌄ · room name · ⋯ · Report. Report stays one tap away (report-and-block.md). */}
        {connected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimise the room. You stay in it"
            onPress={onMinimise}
            style={{ minHeight: size.minTarget, minWidth: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronDown size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          </Pressable>
        ) : null}
        <Text variant="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        {connected ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More: room info, invite, rules and help"
              onPress={() => setMenuOpen(true)}
              style={{ minHeight: size.minTarget, minWidth: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreHorizontal size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report"
              onPress={() => {
                setReportPerson(null);
                setReportOpen(true);
              }}
              style={{ minHeight: size.minTarget, minWidth: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <Flag size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            </Pressable>
          </>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space[5], gap: space[5] }}>
        <View style={{ gap: space[3] }}>
          {oneOnOne && timeLeft !== null ? (
            <Text variant="bodyStrong" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>
              {`${clock(timeLeft)} left`}
            </Text>
          ) : impostorOn && impostor.round ? (
            <Text variant="bodyStrong" color="textSoft">{`Round ${impostor.round.number} of ${ROUNDS_PER_GAME}`}</Text>
          ) : mood || topic || iAmHost || (isSupport && hostPresent) ? (
            <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
              {mood ? <Chip Icon={mood.Icon} label={mood.label} fg={mood.fg} bg={mood.bg} /> : null}
              {topic ? <Chip Icon={Hash} label={topic} fg={colors.textSoft} bg={colors.raised} /> : null}
              {iAmHost ? (
                <Chip Icon={Shield} label="You're the host" fg={colors.emberText} bg={colors.emberSoft} />
              ) : isSupport && hostPresent ? (
                <Chip Icon={Shield} label="Trained host" fg={colors.live} bg={colors.liveSoft} />
              ) : null}
            </View>
          ) : null}
        </View>

        {status === 'removed' ? (
          <RemovedNotice reason={REMOVAL_REASONS.find((r) => r.id === (voice.removedReason ?? removedFor)) ?? null} />
        ) : (
          <BackFromGame back={backFromGame}>
            {table ?? (
              <RoomCircle
                people={people}
                capacity={room?.capacity}
                emptyHint={status === 'connecting' ? 'Finding your room' : undefined}
                centre={
                  countdown !== null ? (
                    <CountdownRing seconds={countdown} />
                  ) : phase === 'waiting' && !isSupport ? (
                    <>
                      <Text variant="heading" center>
                        {room?.door === 'play' ? 'Waiting for players' : 'Waiting for people'}
                      </Text>
                      <Text variant="meta" color="textMeta" center>
                        {`${people.length} of ${room?.capacity ?? people.length}`}
                      </Text>
                    </>
                  ) : undefined
                }
                onSeatPress={onSeat}
                onEmptyPress={canInvite ? invite : undefined}
              />
            )}
          </BackFromGame>
        )}

        {connected && voice.audioBlocked && others.length > 0 ? (
          <Button label="Turn on sound" onPress={() => void voice.unblockAudio()} />
        ) : null}

        {/* Alone in a room: inviting is the one useful thing to do. */}
        {connected && phase === 'waiting' && !isSupport && canInvite ? <Button label="Invite friends" variant="primary" onPress={invite} /> : null}

        {backToGame ? <Button label="Back to the game" onPress={backToGame} /> : null}

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
            accessibilityRole="button"
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
            {phase === 'countdown' && !oneOnOne ? (
              <Button label="Move me to another room" variant="primary" onPress={() => void moveToAnotherRoom()} />
            ) : null}
            {iAmHost && hands.length > 0 ? (
              // The whole strip is one button: "2 hands up. See hands" (room-host-view.md › Accessibility).
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${hands.length} ${hands.length === 1 ? 'hand' : 'hands'} up. See hands`}
                onPress={() => setHandsOpen(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: colors.surface, borderRadius: radius.card, padding: space[3], minHeight: size.buttonPrimary }}
              >
                <Text variant="bodyStrong">{`${hands.length} ${hands.length === 1 ? 'hand' : 'hands'} up`}</Text>
                <View style={{ flexDirection: 'row', flex: 1 }}>
                  {hands.slice(0, 3).map((p, i) => (
                    <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -space[2] }}>
                      <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarBadge + space[2]} />
                    </View>
                  ))}
                </View>
                <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
                  See hands
                </Text>
              </Pressable>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              {iAmHost ? (
                  <RowButton Icon={Hand} label="Hands" badge={hands.length} onPress={() => setHandsOpen(true)} />
                ) : (
                  handButton
                )}
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
                <RowButton Icon={LogOut} label="Leave" danger onPress={() => void leaveRoom()} />
              )}
            </View>
            {phase !== 'countdown' ? (
              <MicControl state={micState} pausedReason={pausedReason} onPress={micPress} />
            ) : null}
          </>
        ) : status === 'connecting' ? (
          <>
            <Button label="Finding your room" variant="primary" loading onPress={() => {}} />
            <Button label="Cancel" variant="quiet" onPress={() => void leaveRoom()} />
          </>
        ) : (
          <>
            {status === 'removed' ? (
              <>
                <Button label="Back to Home" variant="primary" onPress={() => onLeft(null)} />
                {room ? <Button label="This wasn't fair" variant="quiet" onPress={() => setAppealOpen(true)} /> : null}
              </>
            ) : status === 'noHost' ? (
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
            {status !== 'removed' ? <Button label="Back" variant="quiet" onPress={() => onLeft(voice.lastSummary)} /> : null}
          </>
        )}
      </View>

      {sheets}
    </SafeAreaView>
  );
}

// Whether this person is playing the game on the table, only watching it, or it's over.
function tableGameStatus(game: GameId, g: unknown, me: string): 'playing' | 'watching' | 'over' {
  if (!g) return 'watching';
  if (game === 'draughts' || game === 'chess') {
    const x = g as DraughtsGame | ChessGame;
    if (x.winner) return 'over';
    return x.teams.sun.includes(me) || x.teams.sky.includes(me) ? 'playing' : 'watching';
  }
  if (game === 'whot') {
    const x = g as WhotPublic;
    if (x.winner) return 'over';
    return x.players.includes(me) ? 'playing' : 'watching';
  }
  const x = g as MafiaPublic;
  if (x.phase === 'over') return 'over';
  return x.players.includes(me) && !x.out.includes(me) ? 'playing' : 'watching';
}

// Room bottom row button: 56 tall, radius 20, icon over a tiny label (design direction › Room bottom row).
// The game tapped on Let's play, while it hasn't started yet.
function wantedGameName(request: RoomRequest): string | undefined {
  const game = request.kind === 'match' ? request.game : undefined;
  if (!game) return undefined;
  return game === 'ludo' ? 'Ludo' : game === 'impostor' ? 'Find the Impostor' : GAMES[game]?.name;
}

// The room while you browse the app: its name, how many are here, your mic, and a tap to go back in.
function MiniRoomBar({
  title,
  here,
  mic,
  onOpen,
  onMic,
}: {
  title: string;
  here: number;
  mic: MicState;
  onOpen: () => void;
  onMic: () => void;
}) {
  const colors = useColors();
  const live = mic === 'live';
  // Only a mic that can be switched here: paused, blocked or not-yet-allowed mics are handled in the room.
  const canSwitch = mic === 'live' || mic === 'muted';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        marginHorizontal: space[2],
        marginBottom: space[2],
        paddingLeft: space[4],
        backgroundColor: colors.raised,
        borderRadius: radius.card,
        minHeight: size.buttonPrimary,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${here} here. Open the room`}
        onPress={onOpen}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.minTarget }}
      >
        {live ? <View style={{ width: space[2], height: space[2], borderRadius: radius.pill, backgroundColor: colors.live }} /> : null}
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="meta" color="textSoft" numberOfLines={1}>
            {`${here} here · ${live ? "You're live" : mic === 'muted' ? "You're muted" : 'Mic off'}`}
          </Text>
        </View>
        <ChevronUp size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={live ? "You're live. Tap to mute" : canSwitch ? "You're muted. Tap to talk" : 'Mic off. Open the room to turn it on'}
        accessibilityState={{ disabled: !canSwitch }}
        disabled={!canSwitch}
        onPress={onMic}
        style={{
          width: size.buttonPrimary,
          height: size.buttonPrimary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: canSwitch ? 1 : opacity.disabled,
        }}
      >
        {live ? (
          <Mic size={size.icon} color={colors.live} strokeWidth={size.iconStroke} />
        ) : (
          <MicOff size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
        )}
      </Pressable>
    </View>
  );
}

function RowButton({
  Icon,
  label,
  onPress,
  badge = 0,
  active = false,
  disabled = false,
  danger = false,
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
  // Leave: the exit for good, in the danger colour.
  danger?: boolean;
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
      <Icon size={size.icon} color={active ? colors.emberText : danger ? colors.danger : colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="tiny" color={active ? 'emberText' : danger ? 'danger' : 'textSoft'}>
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

// "You were removed from this room" (removed-warned-suspended.md › 1): what happened, which rule, and
// what they can do now. Firm, calm, never shaming.
function RemovedNotice({ reason }: { reason: { title: string; rule: string } | null }) {
  const colors = useColors();
  return (
    <View style={{ gap: space[4], alignItems: 'center', paddingTop: space[5] }} accessibilityLiveRegion="polite">
      <View
        style={{
          width: size.avatarRoom,
          height: size.avatarRoom,
          borderRadius: radius.pill,
          backgroundColor: colors.dangerSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LogOut size={size.icon} color={colors.danger} strokeWidth={size.iconStroke} />
      </View>
      <Text variant="title" center accessibilityRole="header">
        You were removed from this room
      </Text>
      {reason ? (
        <>
          <Text variant="body" color="textSoft" center>
            {`The host removed you for: ${reason.title}.`}
          </Text>
          <View style={{ alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4] }}>
            <Text variant="bodyStrong">{reason.rule}</Text>
          </View>
        </>
      ) : null}
      <Text variant="body" color="textSoft" center>
        {"You can't rejoin this room, but you can join others."}
      </Text>
    </View>
  );
}
