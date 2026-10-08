import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import { buzz } from '../../lib/buzz';
import { playSound } from '../../lib/sounds';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { motion, radius, space } from '../../theme';

// Movement for game mode (game-mode.md › Movement). Transform and opacity only, on the native driver.
// With the phone's Reduce motion setting on, every movement becomes a quick fade.

export type GridMove = { key: number; slides: { from: number; to: number; was: string }[]; captured: { at: number; code: string }[] };

// What just happened on an 8 × 8 board, from the squares before and after: which pieces moved where,
// and which were taken. `sideOf` says whose a piece is. Big changes (a new game) give null.
export function diffBoards(
  prev: (string | null)[],
  board: (string | null)[],
  sideOf: (code: string) => string | null,
): Omit<GridMove, 'key'> | null {
  const changed = board.map((_, i) => i).filter((i) => prev[i] !== board[i]);
  if (changed.length === 0 || changed.length > 6) return null;
  const arrived = changed.filter((i) => board[i]);
  const mover = arrived.length > 0 ? sideOf(board[arrived[0]] as string) : null;
  if (!mover) return null;
  const to = arrived.filter((i) => sideOf(board[i] as string) === mover);
  const from = changed.filter((i) => prev[i] && sideOf(prev[i] as string) === mover && !board[i]);
  const captured = changed.filter((i) => prev[i] && sideOf(prev[i] as string) !== mover).map((i) => ({ at: i, code: prev[i] as string }));
  // Pair each arrival with where the same kind of piece left (castling moves two), else any.
  const left = [...from];
  const slides: { from: number; to: number; was: string }[] = [];
  for (const t of to) {
    let k = left.findIndex((f) => prev[f] === board[t]);
    if (k < 0) k = 0;
    if (left[k] === undefined) continue;
    slides.push({ from: left[k], to: t, was: prev[left[k]] as string });
    left.splice(k, 1);
  }
  return { slides, captured };
}

// The last change on a board, for the movement, with the move or capture sound once per change.
export function useGridMove(board: (string | null)[], sideOf: (code: string) => string | null): GridMove | null {
  const before = useRef(board);
  const counter = useRef(0);
  const [move, setMove] = useState<GridMove | null>(null);
  const boardKey = board.map((c) => c ?? '.').join('');
  useEffect(() => {
    const prev = before.current;
    before.current = board;
    const found = diffBoards(prev, board, sideOf);
    if (!found) {
      if (prev.join() !== board.join()) setMove(null);
      return;
    }
    counter.current += 1;
    setMove({ key: counter.current, ...found });
    if (found.captured.length > 0) {
      playSound('capture');
      buzz.medium();
    } else if (found.slides.length > 0) playSound('move');
    // boardKey stands in for board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);
  return move;
}

// A piece that has just arrived: it slides in from where it was (dx, dy in points). A piece that has
// just been crowned gets a small flip once it lands.
export function SlideIn({ dx, dy, crowned, children }: { dx: number; dy: number; crowned?: boolean; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const slide = Animated.timing(t, {
      toValue: 1,
      duration: reduceMotion ? motion.fast : motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (crowned && !reduceMotion) {
      Animated.sequence([
        slide,
        Animated.timing(flip, { toValue: 0, duration: motion.fast, useNativeDriver: true }),
        Animated.timing(flip, { toValue: 1, duration: motion.fast, useNativeDriver: true }),
      ]).start();
    } else slide.start();
  }, [t, flip, crowned, reduceMotion]);
  const style = reduceMotion
    ? { opacity: t }
    : {
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
          { scaleX: flip },
        ],
      };
  return <Animated.View style={style}>{children}</Animated.View>;
}

// Where square `i` (0..63, row by row) is drawn, in cells, when the board may be turned round.
export function gridSpot(i: number, flip: boolean): { col: number; row: number } {
  const d = flip ? 63 - i : i;
  return { col: d % 8, row: Math.floor(d / 8) };
}

// A piece that has just been taken: it fades and shrinks where it stood.
export function Vanish({ children }: { children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 0,
      duration: reduceMotion ? motion.fast : motion.base,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, reduceMotion]);
  const scale = reduceMotion ? 1 : t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return <Animated.View style={{ opacity: t, transform: [{ scale }] }}>{children}</Animated.View>;
}

// Your turn: a soft chime (only on your phone) and a success buzz, when it becomes your turn.
export function useTurnCue(myTurn: boolean) {
  const was = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !was.current) {
      playSound('turn');
      buzz.success();
    }
    was.current = myTurn;
  }, [myTurn]);
}

// Game won: a short warm chord, once.
export function useWinCue(over: boolean) {
  const was = useRef(over);
  useEffect(() => {
    if (over && !was.current) playSound('won');
    was.current = over;
  }, [over]);
}

// Picking a piece up and dropping it on a square (game-mode.md › Draughts, Chess: "or drag the piece").
// Taps still work: a drag only starts once the finger moves. Squares are 0..63 as drawn for Team Sun;
// `flip` turns the board round for Team Sky.
export function useDragMove({
  cell,
  flip,
  canPick,
  onPick,
  onDrop,
}: {
  cell: number;
  flip: boolean;
  canPick: (square: number) => boolean;
  onPick: (square: number) => void;
  onDrop: (from: number, to: number) => void;
}) {
  const boardRef = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [drag, setDragState] = useState<{ from: number; x: number; y: number } | null>(null);
  const dragRef = useRef<{ from: number; x: number; y: number } | null>(null);
  const setDrag = (next: { from: number; x: number; y: number } | null) => {
    dragRef.current = next;
    setDragState(next);
  };
  const latest = useRef({ cell, flip, canPick, onPick, onDrop });
  latest.current = { cell, flip, canPick, onPick, onDrop };
  // Where the board is on the screen, in the same terms as the finger's position.
  const measure = () => boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => (origin.current = { x: pageX, y: pageY }));
  const squareAt = (pageX: number, pageY: number) => {
    const { cell: c, flip: f } = latest.current;
    const col = Math.floor((pageX - origin.current.x) / c);
    const row = Math.floor((pageY - origin.current.y) / c);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const d = row * 8 + col;
    return f ? 63 - d : d;
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => {
        if (Math.abs(g.dx) + Math.abs(g.dy) < space[2]) return false;
        const from = squareAt(g.x0, g.y0);
        return from !== null && latest.current.canPick(from);
      },
      onPanResponderGrant: (_e, g) => {
        const from = squareAt(g.x0, g.y0);
        if (from === null) return;
        latest.current.onPick(from);
        setDrag({ from, x: g.moveX - origin.current.x, y: g.moveY - origin.current.y });
      },
      onPanResponderMove: (_e, g) => {
        const d = dragRef.current;
        if (d) setDrag({ ...d, x: g.moveX - origin.current.x, y: g.moveY - origin.current.y });
      },
      onPanResponderRelease: (_e, g) => {
        const d = dragRef.current;
        const to = squareAt(g.moveX, g.moveY);
        setDrag(null);
        if (d && to !== null && to !== d.from) latest.current.onDrop(d.from, to);
      },
      onPanResponderTerminate: () => setDrag(null),
    }),
  ).current;
  return { boardRef, onLayout: measure, onTouchStart: measure, panHandlers: pan.panHandlers, drag };
}

// An 8 × 8 board you can drag pieces on. `children` draws the squares (the piece being dragged is
// hidden on its own square); `renderDragged` draws it under the finger.
export function DragBoard({
  side,
  flip,
  canPick,
  onPick,
  onDrop,
  renderDragged,
  children,
}: {
  side: number;
  flip: boolean;
  canPick: (square: number) => boolean;
  onPick: (square: number) => void;
  onDrop: (from: number, to: number) => void;
  renderDragged: (square: number) => ReactNode;
  children: (dragging: number | null) => ReactNode;
}) {
  const cell = side / 8;
  const d = useDragMove({ cell, flip, canPick, onPick, onDrop });
  return (
    <View
      ref={d.boardRef}
      onLayout={d.onLayout}
      onTouchStart={d.onTouchStart}
      {...d.panHandlers}
      style={{ width: side, height: side, borderRadius: radius.small, overflow: 'hidden' }}
    >
      {children(d.drag?.from ?? null)}
      {d.drag ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: d.drag.x - cell / 2,
            top: d.drag.y - cell / 2,
            width: cell,
            height: cell,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: 1.15 }],
          }}
        >
          {renderDragged(d.drag.from)}
        </View>
      ) : null}
    </View>
  );
}
