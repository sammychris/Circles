import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Cloud, MicOff, Sun } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Text } from '../../components/Text';
import { border, fonts, ludo, opacity, radius, size, space, teamColors, type as typeScale, useColors } from '../../theme';
import {
  BASE,
  FINISH,
  HOME_COLUMN,
  TEAM_NAME,
  TRACK_CELLS,
  cellOf,
  movableTokens,
  teamOf,
  type LudoState,
  type Team,
} from './engine';

const CELL = ludo.board / 15;
const TEAM_ICON = { sun: Sun, sky: Cloud } as const;

type Person = { id: string; nickname: string; isMe: boolean; isSpeaking: boolean; isMuted: boolean };

// One person at the top of the table: team ring (or none when watching), the Speaking ring and a
// muted badge, and a tap for save, block and report, like a seat in the room circle.
function TableSeat({ person, team, onPress }: { person: Person; team: Team | null; onPress: (p: Person) => void }) {
  const colors = useColors();
  const ring = person.isSpeaking ? colors.live : team ? teamColors[team].fg : colors.line;
  const status = [person.isMe ? 'You' : person.nickname];
  if (team) status.push(TEAM_NAME[team]);
  else status.push('watching');
  if (person.isSpeaking) status.push('speaking');
  else if (person.isMuted) status.push('muted');
  return (
    <Pressable
      accessibilityRole={person.isMe ? undefined : 'button'}
      accessibilityLabel={status.join(', ')}
      disabled={person.isMe}
      onPress={() => onPress(person)}
      style={{ alignItems: 'center', gap: space[1], width: size.avatarList + space[3] }}
    >
      <View style={{ borderRadius: radius.pill, borderWidth: border.selected, borderColor: ring, padding: border.selected }}>
        <Avatar userId={person.id} nickname={person.nickname} diameter={size.avatarList} />
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
      </View>
      <Text variant="tiny" color={person.isSpeaking ? 'live' : 'textSoft'} numberOfLines={1}>
        {person.isSpeaking ? 'Speaking' : person.isMe ? 'You' : person.nickname}
      </Text>
    </Pressable>
  );
}

function TeamRow({
  team,
  state,
  people,
  onPerson,
  align,
}: {
  team: Team;
  state: LudoState;
  people: Person[];
  onPerson: (p: Person) => void;
  align: 'flex-start' | 'flex-end';
}) {
  const Icon = TEAM_ICON[team];
  const members = people.filter((p) => state.teams[team].includes(p.id));
  const onTurn = state.turn === team && !state.winner;
  return (
    <View style={{ flex: 1, gap: space[2], alignItems: align }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
        <Icon size={size.iconMeta} color={teamColors[team].fg} strokeWidth={size.iconStroke} />
        <Text variant="metaStrong" style={{ color: teamColors[team].fg }}>
          {onTurn ? `${TEAM_NAME[team]}'s turn` : TEAM_NAME[team]}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space[1], flexWrap: 'wrap', justifyContent: align }}>
        {members.map((p) => (
          <TableSeat key={p.id} person={p} team={team} onPress={onPerson} />
        ))}
      </View>
    </View>
  );
}

function Die({ value }: { value: number | null }) {
  const colors = useColors();
  // Pip positions on a 3 × 3 grid for each face.
  const faces: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const pips = value ? faces[value] : [];
  return (
    <View
      accessible
      accessibilityLabel={value ? `Dice shows ${value}` : 'Dice not rolled yet'}
      style={{
        width: ludo.die,
        height: ludo.die,
        borderRadius: radius.small,
        backgroundColor: colors.text,
        padding: space[2],
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <View key={i} style={{ width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' }}>
          {pips.includes(i) ? (
            <View style={{ width: ludo.pip, height: ludo.pip, borderRadius: radius.pill, backgroundColor: colors.bg }} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function cellRect([c, r]: [number, number]) {
  return { x: c * CELL, y: r * CELL };
}

function Board({ state, myTurn, onMove }: { state: LudoState; myTurn: boolean; onMove: (token: number) => void }) {
  const colors = useColors();
  const movable = myTurn ? movableTokens(state) : [];
  const B = ludo.board;
  const six = CELL * 6;

  const tokens: { team: Team; i: number; pos: number; x: number; y: number; d: number }[] = [];
  const stacked = new Map<string, number>();
  (['sun', 'sky'] as Team[]).forEach((team) =>
    state.tokens[team].forEach((pos, i) => {
      const cell = cellOf(team, i, pos);
      const key = cell.join(',');
      const n = stacked.get(key) ?? 0;
      stacked.set(key, n + 1);
      const d = pos === BASE ? ludo.baseToken : ludo.token;
      const shift = pos === BASE ? 0 : n * space[1];
      tokens.push({ team, i, pos, x: cell[0] * CELL + CELL / 2 + shift, y: cell[1] * CELL + CELL / 2 - shift, d });
    }),
  );

  return (
    <View style={{ width: B, height: B, alignSelf: 'center' }} accessibilityLabel="Ludo board">
      <Svg width={B} height={B}>
        <Rect x={0} y={0} width={B} height={B} rx={radius.card} fill={colors.surface} />
        {/* bases: Sun top left, Sky bottom right */}
        <Rect x={0} y={0} width={six} height={six} rx={radius.card} fill={teamColors.sun.bg} />
        <Rect x={B - six} y={B - six} width={six} height={six} rx={radius.card} fill={teamColors.sky.bg} />
        <Rect x={CELL} y={CELL} width={CELL * 4} height={CELL * 4} rx={radius.small} fill={colors.bgDeep} />
        <Rect x={B - six + CELL} y={B - six + CELL} width={CELL * 4} height={CELL * 4} rx={radius.small} fill={colors.bgDeep} />
        {TRACK_CELLS.map((cell, i) => {
          const { x, y } = cellRect(cell);
          return <Rect key={`t${i}`} x={x} y={y} width={CELL} height={CELL} fill="none" stroke={colors.line} strokeWidth={border.hairline} />;
        })}
        {(['sun', 'sky'] as Team[]).map((team) =>
          HOME_COLUMN[team].map((cell, i) => {
            const { x, y } = cellRect(cell);
            return <Rect key={`${team}h${i}`} x={x} y={y} width={CELL} height={CELL} fill={teamColors[team].bg} stroke={colors.line} strokeWidth={border.hairline} />;
          }),
        )}
        {/* centre: two triangles, Sun from the left, Sky from the right */}
        <Path d={`M${six} ${six} L${B / 2} ${B / 2} L${six} ${B - six} Z`} fill={teamColors.sun.fg} />
        <Path d={`M${B - six} ${six} L${B / 2} ${B / 2} L${B - six} ${B - six} Z`} fill={teamColors.sky.fg} />
        <Path d={`M${six} ${six} L${B / 2} ${B / 2} L${B - six} ${six} Z`} fill={colors.raised} />
        <Path d={`M${six} ${B - six} L${B / 2} ${B / 2} L${B - six} ${B - six} Z`} fill={colors.raised} />
      </Svg>
      {tokens.map((t) => {
        const canTap = t.team === state.turn && movable.includes(t.i);
        const where = t.pos === BASE ? 'in base' : t.pos === FINISH ? 'home' : 'on the board';
        const target = Math.max(size.minTarget, t.d);
        return (
          <Pressable
            key={`${t.team}${t.i}`}
            accessibilityRole={canTap ? 'button' : undefined}
            accessibilityLabel={`${TEAM_NAME[t.team]} token ${t.i + 1}, ${where}${canTap ? '. Tap to move' : ''}`}
            disabled={!canTap}
            // Only tokens that can move catch taps, with a full 44 px target around them.
            pointerEvents={canTap ? 'auto' : 'none'}
            onPress={() => onMove(t.i)}
            style={{
              position: 'absolute',
              left: t.x - target / 2,
              top: t.y - target / 2,
              width: target,
              height: target,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: canTap ? 1 : 0,
            }}
          >
            <View
              style={{
                width: t.d,
                height: t.d,
                borderRadius: radius.pill,
                backgroundColor: teamColors[t.team].fg,
                borderWidth: border.selected,
                // Movable tokens get a 2 px warm-white ring.
                borderColor: canTap ? colors.text : colors.bgDeep,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

type Props = {
  state: LudoState;
  me: string;
  // Everyone in the room right now, playing or not.
  people: Person[];
  onPerson: (p: Person) => void;
  onRoll: () => void;
  onMove: (token: number) => void;
  onBringOut: () => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// The table card: teams at the top, the board in the middle, then the dice, what happened and the action.
export function LudoTable({ state, me, people, onPerson, onRoll, onMove, onBringOut, onPlayAgain, onBackToTalking }: Props) {
  const colors = useColors();
  const myTeam = teamOf(state, me);
  const watching = people.filter((p) => !teamOf(state, p.id));
  const myTurn = myTeam === state.turn && !state.winner;
  const movable = myTurn ? movableTokens(state) : [];
  const canBringOut = myTurn && state.dice === 6 && movable.some((i) => state.tokens[state.turn][i] === BASE);

  let instruction: string;
  if (state.winner) instruction = 'Good game. Nothing is kept: no points, no rankings.';
  else if (!myTeam) instruction = "You're watching this game. You can still talk.";
  else if (!myTurn) instruction = `${TEAM_NAME[state.turn]} is deciding. Talk it over with your team.`;
  else if (state.dice === null) instruction = 'Talk it over, then anyone on your team can roll.';
  else if (canBringOut) instruction = 'Talk it over, then bring out a token or tap one on the board.';
  else instruction = 'Tap a token with a white ring to move it.';

  const action = state.winner
    ? { label: 'Play again', onPress: onPlayAgain }
    : myTurn && state.dice === null
      ? { label: 'Roll the dice', onPress: onRoll }
      : canBringOut
        ? { label: 'Bring out a new token', onPress: onBringOut }
        : null;

  return (
    <View style={{ gap: space[4] }}>
      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <TeamRow team="sun" state={state} people={people} onPerson={onPerson} align="flex-start" />
          <TeamRow team="sky" state={state} people={people} onPerson={onPerson} align="flex-end" />
        </View>
        {watching.length > 0 ? (
          <View style={{ gap: space[2] }}>
            <Text variant="metaStrong" color="textSoft">
              Watching and talking
            </Text>
            <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
              {watching.map((p) => (
                <TableSeat key={p.id} person={p} team={null} onPress={onPerson} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
      <Board state={state} myTurn={myTurn} onMove={onMove} />
      <View style={{ flexDirection: 'row', gap: space[4], alignItems: 'center' }}>
        <Die value={state.dice} />
        <View style={{ flex: 1, gap: space[1] }} accessibilityLiveRegion="polite">
          <Text variant="heading">{state.winner ? `${TEAM_NAME[state.winner]} won this game` : state.last}</Text>
          <Text variant="meta" color="textSoft">
            {instruction}
          </Text>
        </View>
      </View>
      {action ? (
        // Table action button: strong but not ember, so the mic stays the room's one ember action.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => ({
            opacity: pressed ? opacity.pressed : 1,
            height: size.tableAction,
            borderRadius: radius.pill,
            backgroundColor: colors.text,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text style={{ color: colors.bg, fontFamily: fonts.extraBold, fontSize: typeScale.body.fontSize }}>{action.label}</Text>
        </Pressable>
      ) : null}
      {state.winner ? (
        <Pressable accessibilityRole="button" onPress={onBackToTalking} style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="bodyStrong" color="textSoft">
            Back to talking
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
