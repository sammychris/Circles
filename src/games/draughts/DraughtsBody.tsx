import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Crown } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { border, ludo, radius, size, space, teamColors, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameOver } from '../shared/GameOver';
import { TeamsHeader } from '../shared/TeamsHeader';
import { SIDE_NAME, sideOf } from '../tableGame';
import { colOf, legalMoves, pieceSide, rowOf, type DraughtsGame } from './engine';

const CELL = ludo.board / 8;

type Props = {
  g: DraughtsGame;
  me: string;
  people: Person[];
  starter: boolean;
  onMove: (move: { from: number; to: number }) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Draughts on the table: your team talks it over, then anyone on it taps a piece and where it goes.
export function DraughtsBody({ g, me, people, starter, onMove, onPlayAgain, onBackToTalking }: Props) {
  const colors = useColors();
  const [picked, setPicked] = useState<number | null>(null);
  const mySide = sideOf(g.teams, me);
  const myTurn = !g.winner && mySide === g.turn;
  const moves = myTurn ? legalMoves(g) : [];
  const from = g.chain ?? picked;
  const targets = from === null ? [] : moves.filter((m) => m.from === from).map((m) => m.to);
  const movable = new Set(moves.map((m) => m.from));
  // Sky looks at the board from its own side.
  const flip = mySide === 'sky';

  const tap = (i: number) => {
    if (!myTurn) return;
    if (from !== null && targets.includes(i)) {
      onMove({ from, to: i });
      setPicked(null);
    } else if (movable.has(i) && g.chain === null) setPicked(i === picked ? null : i);
  };

  const instruction = g.winner
    ? ''
    : !mySide
      ? "You're watching this game. You can still talk."
      : !myTurn
        ? `${SIDE_NAME[g.turn]} is deciding. Talk it over with your team.`
        : g.chain !== null
          ? 'Keep jumping: tap where the piece goes next.'
          : moves.some((m) => Math.abs(rowOf(m.to) - rowOf(m.from)) === 2)
            ? 'You must capture. Tap a piece with a ring, then where it jumps.'
            : 'Talk it over, then tap a piece with a ring and where it goes.';

  return (
    <View style={{ gap: space[4] }}>
      <TeamsHeader teams={g.teams} turn={g.winner ? null : g.turn} people={people} me={me} />
      <View
        accessible={false}
        style={{ width: ludo.board, height: ludo.board, alignSelf: 'center', borderRadius: radius.small, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}
      >
        {Array.from({ length: 64 }, (_, k) => {
          const i = flip ? 63 - k : k;
          const darkSquare = (rowOf(i) + colOf(i)) % 2 === 1;
          const p = g.board[i];
          const side = pieceSide(p);
          const king = p === 'U' || p === 'K';
          const isTarget = targets.includes(i);
          const ring = from === i || (movable.has(i) && from === null);
          const label = side ? `${SIDE_NAME[side]} ${king ? 'king' : 'piece'}${ring ? ', can move' : ''}` : isTarget ? 'Move here' : 'Empty square';
          return (
            <Pressable
              key={i}
              accessibilityRole={ring || isTarget ? 'button' : undefined}
              accessibilityLabel={`${String.fromCharCode(97 + colOf(i))}${8 - rowOf(i)}, ${label}`}
              disabled={!(ring || isTarget)}
              onPress={() => tap(i)}
              style={{ width: CELL, height: CELL, backgroundColor: darkSquare ? colors.surface : colors.raised, alignItems: 'center', justifyContent: 'center' }}
            >
              {side ? (
                <View
                  style={{
                    width: CELL - space[2],
                    height: CELL - space[2],
                    borderRadius: radius.pill,
                    backgroundColor: teamColors[side].fg,
                    borderWidth: ring ? border.selected : 0,
                    borderColor: colors.text,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {king ? <Crown size={size.iconMeta} color={colors.bg} strokeWidth={size.iconStroke} /> : null}
                </View>
              ) : isTarget ? (
                <View style={{ width: space[3], height: space[3], borderRadius: radius.pill, backgroundColor: colors.text }} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {g.winner ? (
        <GameOver
          result={g.winner === 'draw' ? "It's a draw" : `${SIDE_NAME[g.winner]} won this game`}
          canRestart={starter}
          onPlayAgain={onPlayAgain}
          onBackToTalking={onBackToTalking}
        />
      ) : (
        <View style={{ gap: space[1] }} accessibilityLiveRegion="polite">
          <Text variant="heading">{g.last}</Text>
          <Text variant="meta" color="textSoft">
            {instruction}
          </Text>
        </View>
      )}
    </View>
  );
}
