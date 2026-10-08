import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { Cloud, Sun } from 'lucide-react-native';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { buzz } from '../../lib/buzz';
import { playSound } from '../../lib/sounds';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { border, gameMode, ludo, motion, radius, size, space, teamColors, useColors } from '../../theme';
import { GameStage } from '../mode/GameMode';
import { useTurnCue, useWinCue } from '../mode/motion';
import { GameOver } from '../shared/GameOver';
import {
  BASE,
  FINISH,
  HOME_COLUMN,
  SAFE_SQUARES,
  START,
  TEAM_NAME,
  TRACK_CELLS,
  cellOf,
  hopPath,
  movableTokens,
  teamOf,
  type LudoState,
  type Team,
} from './engine';

const TEAM_ICON = { sun: Sun, sky: Cloud } as const;
// Pip positions on a 3 × 3 grid for each face.
const FACES: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// The squares with a star (safe, besides the two start squares).
const STARS = [...SAFE_SQUARES].filter((s) => s !== START.sun && s !== START.sky);

// The dice: a 72 px warm-white tile. It tumbles from the tap until the roll arrives (at least 600 ms),
// and pulses once when it's your team's turn.
function Die({ value, rolling, pulse }: { value: number | null; rolling: boolean; pulse: boolean }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const [face, setFace] = useState(value);
  const spin = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!rolling) {
      setFace(value);
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    // With Reduce motion on, the dice holds still (blank) until the roll arrives.
    if (reduceMotion) {
      setFace(null);
      return;
    }
    const tick = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), motion.fast / 2);
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: motion.slow, easing: Easing.linear, useNativeDriver: true })).start();
    return () => clearInterval(tick);
  }, [rolling, value, spin, reduceMotion]);
  useEffect(() => {
    if (!pulse || reduceMotion) return;
    Animated.sequence([
      Animated.timing(grow, { toValue: 1.08, duration: motion.base, useNativeDriver: true }),
      Animated.timing(grow, { toValue: 1, duration: motion.base, useNativeDriver: true }),
    ]).start();
  }, [pulse, grow, reduceMotion]);
  const pips = face ? FACES[face] : [];
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      accessible
      accessibilityLabel={rolling ? 'Rolling the dice' : value ? `Dice shows ${value}` : 'Dice not rolled yet'}
      accessibilityLiveRegion="polite"
      style={{
        width: gameMode.die,
        height: gameMode.die,
        borderRadius: radius.small,
        backgroundColor: colors.text,
        padding: space[2],
        flexDirection: 'row',
        flexWrap: 'wrap',
        transform: [{ rotate }, { scale: grow }],
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <View key={i} style={{ width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' }}>
          {pips.includes(i) ? (
            <View
              style={{ width: ludo.pip + space[1], height: ludo.pip + space[1], borderRadius: radius.pill, backgroundColor: colors.bg }}
            />
          ) : null}
        </View>
      ))}
    </Animated.View>
  );
}

// A token hops square by square to where it's going (120 ms a square, at most a second in all).
function Token({
  team,
  index,
  pos,
  x,
  y,
  d,
  cell,
  canTap,
  onMove,
}: {
  team: Team;
  index: number;
  pos: number;
  x: number;
  y: number;
  d: number;
  cell: number;
  canTap: boolean;
  onMove: (token: number) => void;
}) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fade = useRef(new Animated.Value(1)).current;
  const was = useRef(pos);
  useEffect(() => {
    const from = was.current;
    was.current = pos;
    if (from === pos) return;
    if (reduceMotion || pos === BASE) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: motion.fast, useNativeDriver: true }).start();
      return;
    }
    const path = hopPath(team, index, from, pos);
    if (path.length === 0) return;
    const start = cellOf(team, index, from);
    const end = path[path.length - 1];
    const each = Math.min(gameMode.hopMs, gameMode.hopMaxMs / path.length);
    offset.setValue({ x: (start[0] - end[0]) * cell, y: (start[1] - end[1]) * cell });
    Animated.sequence(
      path.map(([c, r]) =>
        Animated.timing(offset, {
          toValue: { x: (c - end[0]) * cell, y: (r - end[1]) * cell },
          duration: each,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pos, team, index, cell, offset, fade, reduceMotion]);
  const where = pos === BASE ? 'in base' : pos === FINISH ? 'home' : 'on the board';
  const target = Math.max(size.minTarget, d);
  return (
    <Animated.View
      pointerEvents={canTap ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        left: x - target / 2,
        top: y - target / 2,
        width: target,
        height: target,
        zIndex: canTap ? 2 : 1,
        opacity: fade,
        transform: [{ translateX: offset.x }, { translateY: offset.y }],
      }}
    >
      <Pressable
        accessibilityRole={canTap ? 'button' : undefined}
        accessibilityLabel={`${TEAM_NAME[team]} token ${index + 1}, ${where}${canTap ? '. Tap to move' : ''}`}
        disabled={!canTap}
        onPress={() => {
          buzz.light();
          onMove(index);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: d,
            height: d,
            borderRadius: radius.pill,
            backgroundColor: teamColors[team].fg,
            borderWidth: border.selected,
            // Movable tokens get a 2 px warm-white ring.
            borderColor: canTap ? colors.text : colors.bgDeep,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Never colour alone: each token carries its team's icon. */}
          {(() => {
            const Icon = TEAM_ICON[team];
            return <Icon size={Math.max(size.iconBadge - space[1], d * 0.55)} color={colors.bgDeep} strokeWidth={size.iconStroke} />;
          })()}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Board({ state, side, myTurn, onMove }: { state: LudoState; side: number; myTurn: boolean; onMove: (token: number) => void }) {
  const colors = useColors();
  const movable = myTurn ? movableTokens(state) : [];
  const B = side;
  const CELL = B / 15;
  const six = CELL * 6;
  const token = CELL * 0.8;
  const baseToken = CELL * 1.1;

  const tokens: { team: Team; i: number; pos: number; x: number; y: number; d: number }[] = [];
  const stacked = new Map<string, number>();
  (['sun', 'sky'] as Team[]).forEach((team) =>
    state.tokens[team].forEach((pos, i) => {
      const cell = cellOf(team, i, pos);
      const key = cell.join(',');
      const n = stacked.get(key) ?? 0;
      stacked.set(key, n + 1);
      const d = pos === BASE ? baseToken : token;
      const shift = pos === BASE ? 0 : n * space[1];
      tokens.push({ team, i, pos, x: cell[0] * CELL + CELL / 2 + shift, y: cell[1] * CELL + CELL / 2 - shift, d });
    }),
  );
  const star = (x: number, y: number, r: number) =>
    Array.from({ length: 10 }, (_, k) => {
      const a = (Math.PI / 5) * k - Math.PI / 2;
      const rr = k % 2 === 0 ? r : r * 0.45;
      return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
    }).join(' ');

  return (
    <View style={{ width: B, height: B }} accessibilityLabel="Ludo board">
      <Svg width={B} height={B}>
        <Rect x={0} y={0} width={B} height={B} rx={radius.card} fill={colors.surface} />
        {/* bases: Sun top left, Sky bottom right */}
        <Rect x={0} y={0} width={six} height={six} rx={radius.card} fill={teamColors.sun.bg} />
        <Rect x={B - six} y={B - six} width={six} height={six} rx={radius.card} fill={teamColors.sky.bg} />
        <Rect x={CELL} y={CELL} width={CELL * 4} height={CELL * 4} rx={radius.small} fill={colors.bgDeep} />
        <Rect x={B - six + CELL} y={B - six + CELL} width={CELL * 4} height={CELL * 4} rx={radius.small} fill={colors.bgDeep} />
        {TRACK_CELLS.map(([c, r], i) => (
          <Rect
            key={`t${i}`}
            x={c * CELL}
            y={r * CELL}
            width={CELL}
            height={CELL}
            fill="none"
            stroke={colors.line}
            strokeWidth={border.hairline}
          />
        ))}
        {(['sun', 'sky'] as Team[]).map((team) =>
          HOME_COLUMN[team].map(([c, r], i) => (
            <Rect
              key={`${team}h${i}`}
              x={c * CELL}
              y={r * CELL}
              width={CELL}
              height={CELL}
              fill={teamColors[team].bg}
              stroke={colors.line}
              strokeWidth={border.hairline}
            />
          )),
        )}
        {/* Safe squares: the two start squares in their team's colour, the rest with a star. */}
        {(['sun', 'sky'] as Team[]).map((team) => {
          const [c, r] = TRACK_CELLS[START[team]];
          return (
            <Rect
              key={`start-${team}`}
              x={c * CELL}
              y={r * CELL}
              width={CELL}
              height={CELL}
              fill={teamColors[team].bg}
              stroke={colors.line}
              strokeWidth={border.hairline}
            />
          );
        })}
        {STARS.map((s) => {
          const [c, r] = TRACK_CELLS[s];
          return <Polygon key={`star${s}`} points={star(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL * 0.38)} fill={colors.textMeta} />;
        })}
        {/* centre: two triangles, Sun from the left, Sky from the right */}
        <Path d={`M${six} ${six} L${B / 2} ${B / 2} L${six} ${B - six} Z`} fill={teamColors.sun.fg} />
        <Path d={`M${B - six} ${six} L${B / 2} ${B / 2} L${B - six} ${B - six} Z`} fill={teamColors.sky.fg} />
        <Path d={`M${six} ${six} L${B / 2} ${B / 2} L${B - six} ${six} Z`} fill={colors.raised} />
        <Path d={`M${six} ${B - six} L${B / 2} ${B / 2} L${B - six} ${B - six} Z`} fill={colors.raised} />
      </Svg>
      {tokens.map((t) => (
        <Token
          key={`${t.team}${t.i}`}
          team={t.team}
          index={t.i}
          pos={t.pos}
          x={t.x}
          y={t.y}
          d={t.d}
          cell={CELL}
          canTap={t.team === state.turn && movable.includes(t.i)}
          onMove={onMove}
        />
      ))}
    </View>
  );
}

type Props = {
  state: LudoState;
  me: string;
  // Your move or roll is on its way.
  pending: boolean;
  rollingSince: number | null;
  // Play again: the person who started the game (or anyone, once they've left).
  canRestart: boolean;
  onRolled: () => void;
  onRoll: () => void;
  onMove: (token: number) => void;
  onBringOut: () => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Ludo in game mode: the board fills the board area, the dice and what to do sit under it.
export function LudoTable({
  state,
  me,
  pending,
  rollingSince,
  canRestart,
  onRolled,
  onRoll,
  onMove,
  onBringOut,
  onPlayAgain,
  onBackToTalking,
}: Props) {
  const myTeam = teamOf(state, me);
  const myTurn = myTeam === state.turn && !state.winner;
  const busy = pending || rollingSince !== null;
  const movable = myTurn && !busy ? movableTokens(state) : [];
  const canBringOut = myTurn && !busy && state.dice === 6 && movable.some((i) => state.tokens[state.turn][i] === BASE);
  useTurnCue(myTurn);
  useWinCue(!!state.winner);

  // Someone else on the table rolled: everyone hears the rattle and sees a short tumble.
  const [othersRoll, setOthersRoll] = useState(false);
  const lastDice = useRef(state.dice);
  useEffect(() => {
    const before = lastDice.current;
    lastDice.current = state.dice;
    if (state.dice === null || before !== null || rollingSince !== null) return;
    playSound('dice');
    setOthersRoll(true);
    const t = setTimeout(() => setOthersRoll(false), gameMode.diceMinMs);
    return () => clearTimeout(t);
    // Only when the dice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dice]);

  // The roll arrived: the dice settles, after at least 600 ms of tumbling.
  const seq = useRef(state.seq);
  useEffect(() => {
    if (state.seq === seq.current) return;
    seq.current = state.seq;
    if (rollingSince === null) return;
    const wait = Math.max(0, gameMode.diceMinMs - (Date.now() - rollingSince));
    const t = setTimeout(onRolled, wait);
    return () => clearTimeout(t);
  }, [state.seq, rollingSince, onRolled]);

  let instruction: string;
  if (!myTeam) instruction = "You're watching this game. You can still talk.";
  else if (!myTurn) instruction = 'Talk it over with your team while you wait.';
  else if (rollingSince !== null) instruction = 'Rolling…';
  else if (state.dice === null) instruction = 'Talk it over, then anyone on your team can roll.';
  else if (canBringOut) instruction = 'Bring out a token, or tap one on the board.';
  else instruction = 'Tap a token with a white ring to move it.';

  const action =
    myTurn && state.dice === null
      ? {
          label: 'Roll the dice',
          onPress: () => {
            playSound('dice');
            onRoll();
          },
        }
      : canBringOut
        ? { label: 'Bring out a new token', onPress: onBringOut }
        : null;
  const TurnIcon = TEAM_ICON[state.turn];
  const turnText = state.winner
    ? `${TEAM_NAME[state.winner]} won this game`
    : myTurn
      ? "Your team's turn"
      : `${TEAM_NAME[state.turn]} is playing`;

  return (
    <GameStage
      kind="ludo"
      gameKey={state.id}
      turn={{ text: turnText, Icon: state.winner ? undefined : TurnIcon, iconColor: teamColors[state.turn].fg, mine: myTurn }}
      faces={(id) => ({ team: teamOf(state, id) })}
      won={!!state.winner}
      board={({ size: side }) => <Board state={state} side={side} myTurn={myTurn && !busy} onMove={onMove} />}
      controls={
        state.winner ? (
          <GameOver result={turnText} canRestart={canRestart} onPlayAgain={onPlayAgain} onBackToTalking={onBackToTalking} />
        ) : (
          <View style={{ gap: space[2] }}>
            <View style={{ flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
              <Die value={state.dice} rolling={rollingSince !== null || othersRoll} pulse={myTurn && state.dice === null} />
              <View style={{ flex: 1, gap: space[1] }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {state.last}
                </Text>
                <Text variant="meta" color="textSoft" numberOfLines={2}>
                  {instruction}
                </Text>
              </View>
            </View>
            {action ? <TableAction label={action.label} disabled={busy} onPress={action.onPress} /> : null}
          </View>
        )
      }
    />
  );
}
