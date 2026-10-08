import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Cloud, Crown, Sun } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { buzz } from '../../lib/buzz';
import { border, gameMode, radius, size, space, teamColors, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameStage } from '../mode/GameMode';
import { DragBoard, SlideIn, Vanish, gridSpot, useGridMove, useTurnCue, useWinCue } from '../mode/motion';
import { GameOver } from '../shared/GameOver';
import { scoreLine, setWinnerLine, type SetScore } from '../score';
import { SIDE_NAME, sideOf, type Side } from '../tableGame';
import { colOf, draughts, legalMoves, pieceSide, rowOf, type DraughtsGame, type DraughtsMove } from './engine';

type Props = {
  g: DraughtsGame;
  gameKey: string;
  me: string;
  people: Person[];
  starter: boolean;
  // Your last move is on its way to the starter's phone.
  pending: boolean;
  onMove: (move: DraughtsMove, guess: (g: unknown) => { g: unknown } | null) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
  // The score for this sitting, and a fresh start (new teams, or the score from zero).
  score?: SetScore;
  onFresh?: () => void;
};

const TEAM_ICON = { sun: Sun, sky: Cloud } as const;

// Never colour alone: Sun's pieces are solid with a sun, Sky's are hollow with a cloud, and a king
// shows a crown.
function Piece({ code, cell, ring }: { code: string; cell: number; ring: boolean }) {
  const colors = useColors();
  const side = pieceSide(code) as Side;
  const king = code === 'U' || code === 'K';
  const Icon = king ? Crown : side === 'sun' ? Sun : Cloud;
  return (
    <View
      style={{
        width: cell - space[2],
        height: cell - space[2],
        borderRadius: radius.pill,
        backgroundColor: side === 'sun' ? teamColors.sun.fg : colors.bg,
        borderWidth: ring || side === 'sky' ? border.selected : 0,
        borderColor: ring ? colors.text : teamColors[side].fg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={Math.min(size.icon, cell / 2)} color={side === 'sun' ? colors.bg : teamColors.sky.fg} strokeWidth={size.iconStroke} />
    </View>
  );
}

// Draughts in game mode: your team talks it over, then anyone on it taps (or picks up) a piece and
// where it goes. Your move shows straight away; the starter's phone confirms it.
export function DraughtsBody({ g, gameKey, me, people, starter, pending, onMove, onPlayAgain, onBackToTalking, score, onFresh }: Props) {
  const colors = useColors();
  const [picked, setPicked] = useState<number | null>(null);
  const mySide = sideOf(g.teams, me);
  const myTurn = !g.winner && mySide === g.turn;
  const canAct = myTurn && !pending;
  const moves = canAct ? legalMoves(g) : [];
  const movable = new Set(moves.map((m) => m.from));
  // A piece picked before the board changed (a teammate moved it) no longer counts.
  const stillPicked = picked !== null && movable.has(picked) ? picked : null;
  const from = g.chain ?? stillPicked;
  const targets = from === null ? [] : moves.filter((m) => m.from === from).map((m) => m.to);
  // Sky looks at the board from its own side.
  const flip = mySide === 'sky';
  const board = [...g.board].map((c) => (c === '.' ? null : c));
  const lastMove = useGridMove(board, pieceSide);
  useTurnCue(myTurn);
  useWinCue(!!g.winner);

  const play = (move: DraughtsMove) => {
    onMove(move, (now) => {
      const next = draughts.apply(now as DraughtsGame, move, me, Date.now());
      return next ? { g: next } : null;
    });
    setPicked(null);
  };
  const tap = (i: number) => {
    if (!canAct) return;
    if (from !== null && targets.includes(i)) play({ from, to: i });
    else if (movable.has(i) && g.chain === null) {
      buzz.light();
      setPicked(i === stillPicked ? null : i);
    }
  };

  const TurnIcon = TEAM_ICON[g.turn];
  const turnText = g.winner
    ? g.winner === 'draw'
      ? "It's a draw"
      : `${SIDE_NAME[g.winner]} won this game`
    : myTurn
      ? "Your team's turn"
      : `${SIDE_NAME[g.turn]} is playing`;
  const instruction = !mySide
    ? "You're watching this game. You can still talk."
    : !myTurn
      ? 'Talk it over with your team while you wait.'
      : g.chain !== null
        ? 'Keep jumping: tap where the piece goes next.'
        : moves.some((m) => Math.abs(rowOf(m.to) - rowOf(m.from)) === 2)
          ? 'You must take a piece. Tap a piece with a ring, then where it jumps.'
          : 'Tap a piece with a ring, then where it goes.';

  return (
    <GameStage
      kind="draughts"
      gameKey={gameKey}
      score={score ? scoreLine(score, (k: string) => (k === 'sun' ? 'Sun' : 'Sky')) : null}
      turn={{ text: turnText, Icon: g.winner ? undefined : TurnIcon, iconColor: teamColors[g.turn].fg, mine: myTurn }}
      faces={(id) => ({ team: sideOf(g.teams, id) })}
      won={!!g.winner}
      board={({ size: side }) => {
        const cell = side / 8;
        return (
          <DragBoard
            side={side}
            flip={flip}
            canPick={(i) => canAct && movable.has(i) && (g.chain === null || g.chain === i)}
            onPick={(i) => {
              buzz.light();
              setPicked(i);
            }}
            onDrop={(a, b) => {
              if (moves.some((m) => m.from === a && m.to === b)) play({ from: a, to: b });
            }}
            renderDragged={(i) => (board[i] ? <Piece code={board[i] as string} cell={cell} ring /> : null)}
          >
            {(dragging) => (
              <View accessible={false} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: 64 }, (_, k) => {
                  const i = flip ? 63 - k : k;
                  const darkSquare = (rowOf(i) + colOf(i)) % 2 === 1;
                  const code = board[i];
                  const side = code ? pieceSide(code) : null;
                  const king = code === 'U' || code === 'K';
                  const isTarget = targets.includes(i);
                  const ring = from === i || (movable.has(i) && from === null);
                  const label = side
                    ? `${SIDE_NAME[side]} ${king ? 'king' : 'piece'}${ring ? ', can move' : ''}`
                    : isTarget
                      ? 'move here'
                      : 'empty';
                  const slide = lastMove?.slides.find((m) => m.to === i);
                  const gone = lastMove?.captured.find((c) => c.at === i);
                  const here = gridSpot(i, flip);
                  const was = slide ? gridSpot(slide.from, flip) : null;
                  return (
                    <Pressable
                      key={i}
                      accessibilityRole={ring || isTarget ? 'button' : undefined}
                      accessibilityLabel={`${String.fromCharCode(97 + colOf(i))}${8 - rowOf(i)}, ${label}`}
                      disabled={!(ring || isTarget)}
                      onPress={() => tap(i)}
                      style={{
                        width: cell,
                        height: cell,
                        backgroundColor: darkSquare ? colors.surface : colors.raised,
                        alignItems: 'center',
                        justifyContent: 'center',
                        // A sliding piece passes over the squares around it.
                        zIndex: slide ? 2 : 0,
                      }}
                    >
                      {gone && !code ? (
                        <Vanish key={`v${lastMove?.key}`}>
                          <Piece code={gone.code} cell={cell} ring={false} />
                        </Vanish>
                      ) : null}
                      {code && dragging === i ? null : code ? (
                        slide && was ? (
                          <SlideIn
                            key={`s${lastMove?.key}`}
                            dx={(was.col - here.col) * cell}
                            dy={(was.row - here.row) * cell}
                            crowned={king && slide.was !== code}
                          >
                            <Piece code={code} cell={cell} ring={ring} />
                          </SlideIn>
                        ) : (
                          <Piece code={code} cell={cell} ring={ring} />
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
            )}
          </DragBoard>
        );
      }}
      controls={
        g.winner ? (
          <GameOver
            result={setWinnerLine(score, (k: string) => (k === 'sun' ? 'Team Sun' : 'Team Sky')) ?? turnText}
            score={
              score
                ? { line: scoreLine(score, (k: string) => (k === 'sun' ? 'Team Sun' : 'Team Sky')), setWon: !!score.champion }
                : undefined
            }
            fresh={onFresh ? { label: 'New teams', onPress: onFresh } : undefined}
            canRestart={starter}
            onPlayAgain={onPlayAgain}
            onBackToTalking={onBackToTalking}
          />
        ) : (
          <View style={{ gap: space[1] }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {g.last}
            </Text>
            <Text variant="meta" color="textSoft">
              {instruction}
            </Text>
          </View>
        )
      }
    />
  );
}
