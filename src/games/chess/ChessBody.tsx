import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Chess } from 'chess.js';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { border, fonts, ludo, opacity, radius, space, teamColors, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameOver } from '../shared/GameOver';
import { TeamsHeader } from '../shared/TeamsHeader';
import { SIDE_NAME, sideOf } from '../tableGame';
import { AGREE_SECONDS, targets, turnOf, type ChessGame, type ChessMove } from './engine';

const CELL = ludo.board / 8;
// Solid chess symbols for both teams (the team colour tells them apart, and the label says which).
// The "text style" marker stops phones drawing them as emoji.
const GLYPH: Record<string, string> = { k: '\u265A\uFE0E', q: '\u265B\uFE0E', r: '\u265C\uFE0E', b: '\u265D\uFE0E', n: '\u265E\uFE0E', p: '\u265F\uFE0E' };
const NAME: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

type Props = {
  g: ChessGame;
  me: string;
  people: Person[];
  starter: boolean;
  onMove: (move: ChessMove) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Chess in teams on the table: someone on your team taps a piece and a square to suggest a move;
// teammates agree, or it's played after a minute.
export function ChessBody({ g, me, people, starter, onMove, onPlayAgain, onBackToTalking }: Props) {
  const colors = useColors();
  const [picked, setPicked] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const board = useMemo(() => new Chess(g.fen).board(), [g.fen]);
  const side = turnOf(g.fen);
  const mySide = sideOf(g.teams, me);
  const myTurn = !g.winner && mySide === side;
  const myColour = side === 'sun' ? 'w' : 'b';
  const options = picked ? targets(g.fen, picked) : [];
  const flip = mySide === 'sky';
  const pending = g.pending;
  const suggester = pending ? (pending.by === me ? 'You' : people.find((p) => p.id === pending.by)?.nickname ?? 'Someone') : null;
  const left = pending ? Math.max(0, AGREE_SECONDS - Math.floor((now - pending.at) / 1000)) : 0;

  const tap = (square: string, piece: { color: string } | null) => {
    if (!myTurn) return;
    if (picked && options.includes(square)) {
      onMove({ type: 'suggest', from: picked, to: square });
      setPicked(null);
    } else if (piece && piece.color === myColour) setPicked(square === picked ? null : square);
  };

  const rows = flip ? [...board].reverse().map((r) => [...r].reverse()) : board;
  return (
    <View style={{ gap: space[4] }}>
      <TeamsHeader teams={g.teams} turn={g.winner ? null : side} people={people} me={me} />
      <View style={{ width: ludo.board, height: ludo.board, alignSelf: 'center', borderRadius: radius.small, overflow: 'hidden' }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((cell, c) => {
              const file = flip ? 7 - c : c;
              const rank = flip ? r + 1 : 8 - r;
              const square = `${String.fromCharCode(97 + file)}${rank}`;
              const darkSquare = (file + rank) % 2 === 0;
              const isPicked = picked === square;
              const isTarget = options.includes(square);
              const recent = g.lastMove && (g.lastMove.from === square || g.lastMove.to === square);
              const suggested = pending && (pending.from === square || pending.to === square);
              const team = cell ? (cell.color === 'w' ? 'sun' : 'sky') : null;
              return (
                <Pressable
                  key={square}
                  accessibilityLabel={`${square}${cell && team ? `, ${SIDE_NAME[team]} ${NAME[cell.type]}` : ''}${isTarget ? ', move here' : ''}`}
                  accessibilityRole={myTurn && (isTarget || cell?.color === myColour) ? 'button' : undefined}
                  disabled={!myTurn}
                  onPress={() => tap(square, cell)}
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: darkSquare ? colors.surface : colors.raised,
                    borderWidth: isPicked || suggested ? border.selected : 0,
                    borderColor: isPicked ? colors.text : colors.emberText,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: recent && !isPicked ? opacity.pressed : 1,
                  }}
                >
                  {cell && team ? (
                    <Text style={{ fontFamily: fonts.regular, fontSize: CELL * 0.72, lineHeight: CELL * 0.9, color: teamColors[team].fg }}>
                      {GLYPH[cell.type]}
                    </Text>
                  ) : isTarget ? (
                    <View style={{ width: space[3], height: space[3], borderRadius: radius.pill, backgroundColor: colors.text }} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {g.winner ? (
        <GameOver result={g.last} canRestart={starter} onPlayAgain={onPlayAgain} onBackToTalking={onBackToTalking} />
      ) : pending ? (
        <View style={{ gap: space[2] }} accessibilityLiveRegion="polite">
          <Text variant="heading">{`${suggester} ${pending.by === me ? 'suggest' : 'suggests'} ${pending.san}`}</Text>
          <Text variant="meta" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>
            {`${pending.agrees.length} of ${g.teams[side].length} agree. Played in ${left}s unless someone suggests another.`}
          </Text>
          {myTurn && !pending.agrees.includes(me) ? <TableAction label="Agree" onPress={() => onMove({ type: 'agree' })} /> : null}
          {myTurn ? (
            <Text variant="meta" color="textMeta">
              To suggest another, tap a piece and a square.
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: space[1] }} accessibilityLiveRegion="polite">
          <Text variant="heading">{g.last}</Text>
          <Text variant="meta" color="textSoft">
            {!mySide
              ? "You're watching this game. You can still talk."
              : myTurn
                ? 'Talk it over, then tap a piece and where it goes to suggest a move.'
                : `${SIDE_NAME[side]} is deciding.`}
          </Text>
        </View>
      )}
    </View>
  );
}
