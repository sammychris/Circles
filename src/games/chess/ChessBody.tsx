import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Chess } from 'chess.js';
import { Cloud, Sun } from 'lucide-react-native';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { buzz } from '../../lib/buzz';
import { border, fonts, gameMode, radius, size, space, teamColors, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameStage } from '../mode/GameMode';
import { DragBoard, SlideIn, Vanish, gridSpot, useGridMove, useTurnCue, useWinCue } from '../mode/motion';
import { GameOver } from '../shared/GameOver';
import { SIDE_NAME, sideOf } from '../tableGame';
import { AGREE_SECONDS, chessGame, targets, turnOf, type ChessGame, type ChessMove } from './engine';

// Never colour alone: Team Sun (white) has outlined chess symbols, Team Sky (black) solid ones, and the
// label says which. The "text style" marker stops phones drawing them as emoji.
const OUTLINE: Record<string, string> = { k: '♔︎', q: '♕︎', r: '♖︎', b: '♗︎', n: '♘︎', p: '♙︎' };
const GLYPH: Record<string, string> = { k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎' };
const NAME: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const TEAM_ICON = { sun: Sun, sky: Cloud } as const;

// Squares are numbered 0..63 row by row from a8 (as the board is drawn for Team Sun).
const squareName = (i: number) => `${String.fromCharCode(97 + (i % 8))}${8 - Math.floor(i / 8)}`;
const indexOf = (square: string) => (8 - Number(square[1])) * 8 + (square.charCodeAt(0) - 97);
const codeSide = (code: string) => (code[0] === 'w' ? 'sun' : 'sky');

function Glyph({ code, cell }: { code: string; cell: number }) {
  const team = codeSide(code);
  return (
    // Pieces are sized to their square, not to the phone's text size, so they never spill over.
    <Text
      allowFontScaling={false}
      style={{ fontFamily: fonts.regular, fontSize: cell * 0.72, lineHeight: cell * 0.9, color: teamColors[team].fg }}
    >
      {team === 'sun' ? OUTLINE[code[1]] : GLYPH[code[1]]}
    </Text>
  );
}

type Props = {
  g: ChessGame;
  gameKey: string;
  me: string;
  people: Person[];
  starter: boolean;
  pending: boolean;
  onMove: (move: ChessMove, guess: (g: unknown) => { g: unknown } | null) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Chess in teams in game mode: someone on your team taps a piece and a square to suggest a move;
// teammates agree, or it's played after a minute.
export function ChessBody({ g, gameKey, me, people, starter, pending: movePending, onMove, onPlayAgain, onBackToTalking }: Props) {
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
  const chess = useMemo(() => new Chess(g.fen), [g.fen]);
  const board = useMemo(
    () =>
      chess
        .board()
        .flat()
        .map((c) => (c ? `${c.color}${c.type}` : null)),
    [chess],
  );
  const side = turnOf(g.fen);
  const mySide = sideOf(g.teams, me);
  const myTurn = !g.winner && mySide === side;
  const canAct = myTurn && !movePending;
  const myColour = side === 'sun' ? 'w' : 'b';
  const options = picked && canAct ? targets(g.fen, picked) : [];
  const flip = mySide === 'sky';
  const pending = g.pending;
  const suggester = pending ? (pending.by === me ? 'You' : (people.find((p) => p.id === pending.by)?.nickname ?? 'Someone')) : null;
  const left = pending ? Math.max(0, AGREE_SECONDS - Math.floor((now - pendingLocal.current) / 1000)) : 0;
  const inCheck = !g.winner && chess.inCheck();
  const kingAt = inCheck ? board.findIndex((c) => c === `${myColour}k`) : -1;
  const lastMove = useGridMove(board, codeSide);
  useTurnCue(myTurn);
  useWinCue(!!g.winner);

  const send = (move: ChessMove) =>
    onMove(move, (current) => {
      const next = chessGame.apply(current as ChessGame, move, me, Date.now());
      return next ? { g: { ...next, sentAt: Date.now() } } : null;
    });

  const tap = (square: string) => {
    if (!canAct) return;
    const code = board[indexOf(square)];
    if (picked && options.includes(square)) {
      send({ type: 'suggest', from: picked, to: square });
      setPicked(null);
    } else if (code && code[0] === myColour) {
      buzz.light();
      setPicked(square === picked ? null : square);
    }
  };

  const turnText = g.winner ? g.last : `${inCheck ? 'Check. ' : ''}${myTurn ? "Your team's turn" : `${SIDE_NAME[side]} is playing`}`;

  return (
    <GameStage
      kind="chess"
      gameKey={gameKey}
      turn={{ text: turnText, Icon: g.winner ? undefined : TEAM_ICON[side], iconColor: teamColors[side].fg, mine: myTurn }}
      faces={(id) => ({ team: sideOf(g.teams, id) })}
      won={!!g.winner}
      board={({ size: boardSide }) => {
        const cell = boardSide / 8;
        const centre = (i: number) => {
          const spot = gridSpot(i, flip);
          return { x: (spot.col + 0.5) * cell, y: (spot.row + 0.5) * cell };
        };
        const line = pending ? { a: centre(indexOf(pending.from)), b: centre(indexOf(pending.to)) } : null;
        return (
          <DragBoard
            side={boardSide}
            flip={flip}
            canPick={(i) => canAct && !!board[i] && (board[i] as string)[0] === myColour}
            onPick={(i) => {
              buzz.light();
              setPicked(squareName(i));
            }}
            onDrop={(a, b) => {
              if (targets(g.fen, squareName(a)).includes(squareName(b))) {
                send({ type: 'suggest', from: squareName(a), to: squareName(b) });
                setPicked(null);
              }
            }}
            renderDragged={(i) => (board[i] ? <Glyph code={board[i] as string} cell={cell} /> : null)}
          >
            {(dragging) => (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: 64 }, (_, k) => {
                    const i = flip ? 63 - k : k;
                    const square = squareName(i);
                    const file = i % 8;
                    const rank = 8 - Math.floor(i / 8);
                    // a1 is a dark square.
                    const darkSquare = (file + rank) % 2 === 1;
                    const code = board[i];
                    const team = code ? codeSide(code) : null;
                    const isPicked = picked === square;
                    const isTarget = options.includes(square);
                    const recent = g.lastMove && (g.lastMove.from === square || g.lastMove.to === square);
                    const slide = lastMove?.slides.find((m) => m.to === i);
                    const gone = lastMove?.captured.find((c) => c.at === i);
                    const here = gridSpot(i, flip);
                    const was = slide ? gridSpot(slide.from, flip) : null;
                    const mine = !!code && code[0] === myColour && canAct;
                    return (
                      <Pressable
                        key={square}
                        accessibilityLabel={`${square}${code && team ? `, ${SIDE_NAME[team]} ${NAME[code[1]]}` : ''}${i === kingAt ? ', in check' : ''}${mine ? ', can move' : ''}${isTarget ? ', move here' : ''}`}
                        accessibilityRole={isTarget || mine ? 'button' : undefined}
                        disabled={!canAct}
                        onPress={() => tap(square)}
                        style={{
                          width: cell,
                          height: cell,
                          backgroundColor: darkSquare ? colors.surface : colors.raised,
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: slide ? 2 : 0,
                        }}
                      >
                        {/* The last move's two squares get a faint tint. */}
                        {recent ? (
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: 0,
                              bottom: 0,
                              backgroundColor: colors.text,
                              opacity: gameMode.lastMoveTint,
                            }}
                          />
                        ) : null}
                        {isPicked || i === kingAt || (isTarget && code) ? (
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: 0,
                              bottom: 0,
                              borderWidth: border.selected,
                              borderColor: i === kingAt && !isPicked ? colors.danger : colors.text,
                              borderRadius: isTarget && code ? radius.pill : 0,
                            }}
                          />
                        ) : null}
                        {gone && (!code || codeSide(code) !== codeSide(gone.code)) ? (
                          <View style={{ position: 'absolute' }}>
                            <Vanish key={`v${lastMove?.key}`}>
                              <Glyph code={gone.code} cell={cell} />
                            </Vanish>
                          </View>
                        ) : null}
                        {code && dragging === i ? null : code ? (
                          slide && was ? (
                            <SlideIn key={`s${lastMove?.key}`} dx={(was.col - here.col) * cell} dy={(was.row - here.row) * cell}>
                              <Glyph code={code} cell={cell} />
                            </SlideIn>
                          ) : (
                            <Glyph code={code} cell={cell} />
                          )
                        ) : isTarget ? (
                          <View
                            style={{
                              width: gameMode.legalDot,
                              height: gameMode.legalDot,
                              borderRadius: radius.pill,
                              backgroundColor: colors.text,
                            }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                {/* The suggested move: a soft line from square to square. */}
                {line ? (
                  <Svg width={boardSide} height={boardSide} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
                    <Line
                      x1={line.a.x}
                      y1={line.a.y}
                      x2={line.b.x}
                      y2={line.b.y}
                      stroke={colors.textSoft}
                      strokeWidth={border.selected * 2}
                      strokeLinecap="round"
                    />
                  </Svg>
                ) : null}
              </>
            )}
          </DragBoard>
        );
      }}
      controls={
        g.winner ? (
          <GameOver result={g.last} canRestart={starter} onPlayAgain={onPlayAgain} onBackToTalking={onBackToTalking} />
        ) : pending ? (
          <View style={{ gap: space[2] }}>
            <Text
              variant="bodyStrong"
              numberOfLines={1}
            >{`${suggester} ${pending.by === me ? 'suggest' : 'suggests'} ${pending.san}`}</Text>
            <Text variant="meta" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>
              {`${pending.agrees.length} of ${g.teams[side].length} agree. Played in ${left}s.`}
            </Text>
            {myTurn && !pending.agrees.includes(me) ? (
              <TableAction label="Agree" disabled={movePending} onPress={() => send({ type: 'agree' })} />
            ) : null}
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
          <View style={{ gap: space[1] }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {g.last}
            </Text>
            <Text variant="meta" color="textSoft">
              {!mySide
                ? "You're watching this game. You can still talk."
                : myTurn
                  ? 'Talk it over, then tap a piece and where it goes to suggest a move.'
                  : 'Talk it over with your team while you wait.'}
            </Text>
          </View>
        )
      }
    />
  );
}
