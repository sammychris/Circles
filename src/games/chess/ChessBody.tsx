import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Chess } from 'chess.js';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { border, fonts, ludo, opacity, radius, size, space, teamColors, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameOver } from '../shared/GameOver';
import { TeamsHeader } from '../shared/TeamsHeader';
import { SIDE_NAME, sideOf } from '../tableGame';
import { AGREE_SECONDS, targets, turnOf, type ChessGame, type ChessMove } from './engine';

const CELL = ludo.board / 8;
// Never colour alone: Team Sun (white) has outlined chess symbols, Team Sky (black) solid ones, and the
// label says which. The "text style" marker stops phones drawing them as emoji.
const OUTLINE: Record<string, string> = { k: '\u2654\uFE0E', q: '\u2655\uFE0E', r: '\u2656\uFE0E', b: '\u2657\uFE0E', n: '\u2658\uFE0E', p: '\u2659\uFE0E' };
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
  const [suggesting, setSuggesting] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // The suggestion's time, on this phone's own clock (the starter's clock can differ).
  const pendingLocal = useRef(0);
  useEffect(() => {
    if (g.pending) pendingLocal.current = Date.now() - Math.max(0, g.sentAt - g.pending.at);
    setSuggesting(false);
    // Only when a new update arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.sentAt]);
  const board = useMemo(() => new Chess(g.fen).board(), [g.fen]);
  const side = turnOf(g.fen);
  const mySide = sideOf(g.teams, me);
  const myTurn = !g.winner && mySide === side;
  const myColour = side === 'sun' ? 'w' : 'b';
  const options = picked ? targets(g.fen, picked) : [];
  const flip = mySide === 'sky';
  const pending = g.pending;
  const suggester = pending ? (pending.by === me ? 'You' : people.find((p) => p.id === pending.by)?.nickname ?? 'Someone') : null;
  const left = pending ? Math.max(0, AGREE_SECONDS - Math.floor((now - pendingLocal.current) / 1000)) : 0;

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
              // a1 is a dark square.
              const darkSquare = (file + rank) % 2 === 1;
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
                    borderColor: isPicked ? colors.text : colors.textSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: recent && !isPicked ? opacity.pressed : 1,
                  }}
                >
                  {cell && team ? (
                    <Text style={{ fontFamily: fonts.regular, fontSize: CELL * 0.72, lineHeight: CELL * 0.9, color: teamColors[team].fg }}>
                      {team === 'sun' ? OUTLINE[cell.type] : GLYPH[cell.type]}
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
            {`${pending.agrees.length} of ${g.teams[side].length} agree. Played in ${left}s. A new suggestion takes its place.`}
          </Text>
          {myTurn && !pending.agrees.includes(me) ? <TableAction label="Agree" onPress={() => onMove({ type: 'agree' })} /> : null}
          {myTurn ? (
            suggesting ? (
              <Text variant="meta" color="textSoft">
                Tap a piece, then where it goes.
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSuggesting(true)}
                style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text variant="bodyStrong" color="textSoft">
                  Suggest another
                </Text>
              </Pressable>
            )
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
