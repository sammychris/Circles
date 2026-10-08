import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import {
  BookOpen,
  Check,
  Cloud,
  DoorOpen,
  Eye,
  EyeOff,
  Flag,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Sun,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Glow } from '../../components/Glow';
import { Sheet } from '../../components/Sheet';
import { Text } from '../../components/Text';
import { useSoundSetting } from '../../lib/sounds';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { border, gameMode, motion, opacity, radius, size, space, teamColors, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import type { Side } from '../tableGame';
import { GAME_TITLE, HOW_TO_PLAY, type GameKind } from './howToPlay';

// Game mode (docs/design/pages/game-mode.md): while a game is on the table, the room becomes one full
// screen that never scrolls. Faces at the top, then whose turn it is, the board, the game's own
// buttons, and at the bottom only the mic and Chat. Everything else is in the ⋯ menu.

// What the room gives every game screen.
export type GameModeEnv = {
  people: Person[];
  // The mic control: never hidden, so muting is always one tap away.
  mic: ReactNode;
  unread: number;
  onChat: () => void;
  onReport: () => void;
  // Leave game (players), Stop watching (watchers) or End game (the starter). Null when there's none.
  exit: { label: string; onPress: () => void } | null;
  onLeaveRoom: () => void;
  // A short reconnect: the board greys until the game is back.
  reconnecting: boolean;
  // Toasts and notes that sit just above the bottom bar.
  above?: ReactNode;
  // A line under the board, e.g. "That move didn't go through. Try again."
  note?: string | null;
};

const Env = createContext<GameModeEnv | null>(null);
export const GameModeProvider = Env.Provider;

// What a face in the strip shows besides the person: their team, and in Find the Impostor where they
// are in the speaking order.
export type FaceMark = { team?: Side | null; order?: 'done' | 'talking' | 'next' | null; dim?: boolean };

const TEAM_ICON: Record<Side, LucideIcon> = { sun: Sun, sky: Cloud };

// Hidden faces are remembered on this phone for the rest of that game.
const foldedGames = new Map<string, boolean>();

function Face({ person, mark, overlap, first }: { person: Person; mark: FaceMark; overlap: boolean; first: boolean }) {
  const colors = useColors();
  const team = mark.team ?? null;
  const TeamIcon = team ? TEAM_ICON[team] : null;
  const talking = person.isSpeaking || mark.order === 'talking';
  const label = person.isMe ? (mark.order === 'next' ? 'You next' : 'You') : mark.order === 'next' ? 'Next' : null;
  return (
    <View
      style={{
        alignItems: 'center',
        marginLeft: first ? 0 : overlap ? -gameMode.faceOverlap : space[1],
        opacity: mark.order === 'done' || mark.dim ? opacity.disabled : 1,
      }}
    >
      {/* The speaking glow, scaled down: a live ring outside the team ring. */}
      <View
        style={{
          borderRadius: radius.pill,
          borderWidth: border.selected,
          borderColor: talking ? colors.live : 'transparent',
          backgroundColor: colors.bg,
        }}
      >
        <View style={{ borderRadius: radius.pill, borderWidth: border.selected, borderColor: team ? teamColors[team].fg : 'transparent' }}>
          <Avatar userId={person.id} nickname={person.nickname} diameter={gameMode.faceAvatar} />
        </View>
        {TeamIcon || mark.order === 'done' ? (
          <View
            style={{
              position: 'absolute',
              right: -space[1],
              bottom: -space[1],
              width: size.iconMeta,
              height: size.iconMeta,
              borderRadius: radius.pill,
              backgroundColor: colors.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mark.order === 'done' ? (
              <Check size={size.iconBadge} color={colors.textSoft} strokeWidth={size.iconStroke} />
            ) : TeamIcon && team ? (
              <TeamIcon size={size.iconBadge} color={teamColors[team].fg} strokeWidth={size.iconStroke} />
            ) : null}
          </View>
        ) : null}
      </View>
      <Text variant="tiny" color={mark.order === 'next' ? 'emberText' : talking ? 'live' : 'textSoft'} numberOfLines={1}>
        {label ?? ' '}
      </Text>
    </View>
  );
}

function faceWords(person: Person, mark: FaceMark): string {
  const parts = [person.isMe ? 'You' : person.nickname];
  if (mark.team) parts.push(mark.team === 'sun' ? 'Team Sun' : 'Team Sky');
  if (person.isSpeaking) parts.push('speaking');
  else if (person.isMuted) parts.push('muted');
  if (mark.order === 'talking') parts.push('their turn to talk');
  if (mark.order === 'next') parts.push('next');
  if (mark.order === 'done') parts.push('done');
  return parts.join(', ');
}

function FaceStrip({
  people,
  faces,
  folded,
  onToggle,
  onMenu,
}: {
  people: Person[];
  faces?: (id: string) => FaceMark;
  folded: boolean;
  onToggle: () => void;
  onMenu: () => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const speaker = people.find((p) => p.isSpeaking);
  // The speaker's name always stays visible, because voice comes first.
  const line = `${people.length} here${speaker ? `. ${speaker.isMe ? "You're speaking" : `${speaker.nickname} is speaking`}` : ''}`;
  const each = gameMode.faceAvatar + border.selected * 4 + space[1];
  const overlap = width > 0 && people.length * each > width;
  const describe = folded ? line : `${line}. ${people.map((p) => faceWords(p, faces?.(p.id) ?? {})).join('. ')}`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: gameMode.boardInset,
        minHeight: folded ? gameMode.faceStripFolded : gameMode.faceStrip,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${describe}. ${folded ? 'Tap to show faces' : 'Tap to hide faces'}`}
        onPress={onToggle}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ flex: 1, minHeight: size.minTarget, justifyContent: 'center' }}
      >
        {folded ? (
          <Text variant="meta" color="textSoft" numberOfLines={1}>
            {line}
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden' }}>
            {people.map((p, i) => (
              <Face key={p.id} person={p} mark={faces?.(p.id) ?? {}} overlap={overlap} first={i === 0} />
            ))}
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Room and game options"
        onPress={onMenu}
        style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center', marginRight: space[1] }}
      >
        <MoreHorizontal size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
      </Pressable>
    </View>
  );
}

function MenuRow({ Icon, label, onPress, danger }: { Icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.minTarget + space[1],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <Icon size={size.icon} color={danger ? colors.danger : colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="bodyStrong" color={danger ? 'danger' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

// Sound on or off: a switch, remembered on the phone (it's also in Me).
function SoundRow({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const colors = useColors();
  const Icon = on ? Volume2 : VolumeX;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Sound"
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={{ minHeight: size.minTarget + space[1], flexDirection: 'row', alignItems: 'center', gap: space[3] }}
    >
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        Sound
      </Text>
      <View
        style={{
          width: size.switchWidth,
          height: size.switchHeight,
          borderRadius: radius.pill,
          backgroundColor: on ? colors.text : colors.raised,
          padding: space[1],
          alignItems: on ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size.switchHeight - space[2],
            height: size.switchHeight - space[2],
            borderRadius: radius.pill,
            backgroundColor: on ? colors.bg : colors.textMeta,
          }}
        />
      </View>
    </Pressable>
  );
}

type BoardArea = { size: number; width: number; height: number };

type StageProps = {
  kind: GameKind;
  // Which game this is, so hidden faces are remembered for the rest of it.
  gameKey: string;
  turn: { text: string; Icon?: LucideIcon; iconColor?: string; mine?: boolean };
  faces?: (id: string) => FaceMark;
  // The board, drawn at the size it gets: square (the screen width minus 16 each side, or less on a
  // short screen), centred in the space left over.
  board: (area: BoardArea) => ReactNode;
  controls?: ReactNode;
  // A line under the board: "That move didn't go through. Try again."
  note?: string | null;
  // Mafia's night: everything dims except the mic and the night's own content.
  night?: boolean;
  // The game is won: a soft warm glow behind the board.
  won?: boolean;
};

export function GameStage({ kind, gameKey, turn, faces, board, controls, note, night, won }: StageProps) {
  const env = useContext(Env);
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const { fontScale } = useWindowDimensions();
  const [folded, setFolded] = useState(() => foldedGames.get(gameKey) ?? fontScale >= gameMode.foldFontScale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [soundOn, setSoundOn] = useSoundSetting();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  // Going in: the board grows into place (a fade with Reduce motion on).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: reduceMotion ? motion.base : motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion]);

  // Your turn: the turn line glows softly once.
  const glow = useRef(new Animated.Value(0)).current;
  const wasMine = useRef(turn.mine);
  useEffect(() => {
    if (turn.mine && !wasMine.current) {
      glow.setValue(0);
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: motion.slow, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: motion.slow, useNativeDriver: true }),
      ]).start();
    }
    wasMine.current = turn.mine;
  }, [turn.mine, glow]);

  // Game won: a soft warm glow behind the result. No confetti: Circles is calm.
  const wonGlow = useRef(new Animated.Value(won ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(wonGlow, {
      toValue: won ? 1 : 0,
      duration: reduceMotion ? motion.base : gameMode.wonGlowMs,
      useNativeDriver: true,
    }).start();
  }, [won, wonGlow, reduceMotion]);

  if (!env) return null;
  const toggleFaces = () => {
    foldedGames.set(gameKey, !folded);
    setFolded(!folded);
  };
  // One sheet at a time: the menu closes before the next one opens.
  const fromMenu = (then: () => void) => {
    setMenuOpen(false);
    setTimeout(then, motion.slow);
  };

  const boardSize = area ? Math.max(0, Math.floor(Math.min(area.width - gameMode.boardInset * 2, area.height))) : 0;
  const TurnIcon = turn.Icon;
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.92, 1] });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: enter }}>
        <View>
          <FaceStrip people={env.people} faces={faces} folded={folded} onToggle={toggleFaces} onMenu={() => setMenuOpen(true)} />
          <View
            accessibilityLiveRegion="polite"
            style={{
              height: gameMode.turnLine,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
              paddingHorizontal: gameMode.boardInset,
            }}
          >
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: glow }}>
              <Glow diameter={gameMode.turnLine * 6} centerX={gameMode.turnLine * 2} centerY={gameMode.turnLine / 2} />
            </Animated.View>
            {TurnIcon ? <TurnIcon size={size.icon} color={turn.iconColor ?? colors.textSoft} strokeWidth={size.iconStroke} /> : null}
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {turn.text}
            </Text>
          </View>
          {night ? (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.scrim }}
            />
          ) : null}
        </View>

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space[2] }}
          onLayout={(e: LayoutChangeEvent) =>
            setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height - space[4] })
          }
        >
          {area && won ? (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: wonGlow }}>
              <Glow diameter={boardSize * 1.4} centerX={area.width / 2} centerY={area.height / 2 + space[2]} strength={1.5} />
            </Animated.View>
          ) : null}
          {area && boardSize > 0 ? (
            <Animated.View
              style={{ transform: [{ scale }], opacity: env.reconnecting ? opacity.disabled : 1 }}
              pointerEvents={env.reconnecting ? 'none' : 'auto'}
            >
              {board({ size: boardSize, width: area.width - gameMode.boardInset * 2, height: area.height })}
            </Animated.View>
          ) : null}
        </View>
        {env.reconnecting || note || env.note ? (
          <Text variant="meta" color="textSoft" center accessibilityLiveRegion="polite" style={{ paddingHorizontal: gameMode.boardInset }}>
            {env.reconnecting ? 'Getting the game back…' : (note ?? env.note)}
          </Text>
        ) : null}

        {controls ? <View style={{ paddingHorizontal: gameMode.boardInset, paddingTop: space[2], gap: space[2] }}>{controls}</View> : null}
      </Animated.View>

      <View style={{ paddingHorizontal: gameMode.boardInset, paddingTop: space[3], paddingBottom: space[3], gap: space[3] }}>
        {env.above}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <View style={{ flex: 1 }}>{env.mic}</View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={env.unread > 0 ? `Chat, ${env.unread} new` : 'Chat'}
            onPress={env.onChat}
            style={{
              width: gameMode.chatButton,
              height: gameMode.chatButton,
              borderRadius: radius.card,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            {env.unread > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: space[3],
                  right: space[3],
                  width: space[2] + space[1],
                  height: space[2] + space[1],
                  borderRadius: radius.pill,
                  backgroundColor: colors.emberText,
                }}
              />
            ) : null}
          </Pressable>
        </View>
      </View>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <Text variant="title" accessibilityRole="header">
          {GAME_TITLE[kind]}
        </Text>
        <View style={{ gap: space[1] }}>
          <MenuRow Icon={BookOpen} label="How to play" onPress={() => fromMenu(() => setHowOpen(true))} />
          <MenuRow
            Icon={folded ? Eye : EyeOff}
            label={folded ? 'Show faces' : 'Hide faces'}
            onPress={() => {
              toggleFaces();
              setMenuOpen(false);
            }}
          />
          <SoundRow on={soundOn} onChange={setSoundOn} />
          <MenuRow Icon={Flag} label="Report someone" onPress={() => fromMenu(env.onReport)} />
          {env.exit ? (
            <MenuRow
              Icon={LogOut}
              label={env.exit.label}
              onPress={() => {
                setMenuOpen(false);
                env.exit?.onPress();
              }}
            />
          ) : null}
          <View style={{ height: border.hairline, backgroundColor: colors.divider, marginVertical: space[2] }} />
          <MenuRow Icon={DoorOpen} label="Leave room" danger onPress={() => fromMenu(() => setConfirmLeave(true))} />
        </View>
      </Sheet>

      <Sheet visible={howOpen} onClose={() => setHowOpen(false)}>
        <Text variant="title" accessibilityRole="header">
          {`How to play ${GAME_TITLE[kind]}`}
        </Text>
        <View style={{ gap: space[3] }}>
          {HOW_TO_PLAY[kind].map((line) => (
            <Text key={line} variant="body" color="textSoft">
              {line}
            </Text>
          ))}
        </View>
        <Button label="Got it" onPress={() => setHowOpen(false)} />
      </Sheet>

      {/* Leaving the room is never one stray tap: it always asks first, and tapping outside doesn't close it. */}
      <Sheet visible={confirmLeave} onClose={() => setConfirmLeave(false)} dismissable={false}>
        <View style={{ gap: space[2] }}>
          <Text variant="title" accessibilityRole="header">
            Leave the room?
          </Text>
          <Text variant="body" color="textSoft">
            {"You'll leave the game too."}
          </Text>
        </View>
        <View style={{ gap: space[3] }}>
          <Button
            label="Leave"
            variant="danger"
            onPress={() => {
              setConfirmLeave(false);
              env.onLeaveRoom();
            }}
          />
          <Button label="Stay" onPress={() => setConfirmLeave(false)} />
        </View>
      </Sheet>
    </View>
  );
}

// Coming out of game mode: the room circle grows back into place (a fade with Reduce motion on).
// `back` changes each time a game ends on this phone.
export function BackFromGame({ back, children }: { back: number; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (back === 0) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: reduceMotion ? motion.base : motion.slow, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [back, t, reduceMotion]);
  const scale = reduceMotion ? 1 : t.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] });
  return <Animated.View style={{ opacity: t, transform: [{ scale }] }}>{children}</Animated.View>;
}
