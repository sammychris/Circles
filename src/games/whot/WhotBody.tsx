import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { buzz } from '../../lib/buzz';
import { playSound } from '../../lib/sounds';
import { useReduceMotion } from '../../lib/useReduceMotion';
import { border, gameMode, motion, opacity, radius, size, space, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameStage } from '../mode/GameMode';
import { useTurnCue, useWinCue } from '../mode/motion';
import { GameOver } from '../shared/GameOver';
import { scoreLine, setWinnerLine, type SetScore } from '../score';
import { SHAPES, TURN_SECONDS, canPlay, parse, type Card, type Shape, type WhotMove, type WhotPublic } from './engine';

const CARD = gameMode.card;
const BIG = { w: CARD.w * 1.5, h: CARD.h * 1.5 };
// How far a lifted card rises out of the hand.
const LIFT = space[3];

function ShapeMark({ shape, s, color }: { shape: Shape | 'whot'; s: number; color: string }) {
  if (shape === 'whot') {
    return (
      <Text variant="tiny" style={{ color }}>
        WHOT
      </Text>
    );
  }
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      {shape === 'circle' ? <Circle cx={12} cy={12} r={9} fill={color} /> : null}
      {shape === 'triangle' ? <Polygon points="12,3 22,21 2,21" fill={color} /> : null}
      {shape === 'square' ? <Rect x={4} y={4} width={16} height={16} fill={color} /> : null}
      {shape === 'cross' ? <Path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill={color} /> : null}
      {shape === 'star' ? <Polygon points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9" fill={color} /> : null}
    </Svg>
  );
}

const SHAPE_NAME: Record<Shape | 'whot', string> = {
  circle: 'circle',
  triangle: 'triangle',
  cross: 'cross',
  square: 'square',
  star: 'star',
  whot: 'Whot',
};
const cardWords = (card: Card) => {
  const c = parse(card);
  return c.shape === 'whot' ? 'Whot 20' : `${SHAPE_NAME[c.shape]} ${c.n}`;
};

function CardFace({ card, big }: { card: Card; big?: boolean }) {
  const colors = useColors();
  const c = parse(card);
  const dims = big ? BIG : CARD;
  return (
    <View
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: radius.small,
        backgroundColor: colors.text,
        borderWidth: border.hairline,
        borderColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space[1],
      }}
    >
      <Text variant={big ? 'heading' : 'metaStrong'} style={{ color: colors.bg }}>
        {String(c.n)}
      </Text>
      <ShapeMark shape={c.shape} s={big ? size.icon * 1.5 : size.icon} color={colors.bg} />
      <View />
    </View>
  );
}

// The card on top of the pile flies in: from below when you played it, from the faces above when
// someone else did.
function PileCard({ card, mine, flyKey }: { card: Card; mine: boolean; flyKey: number }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (flyKey === 0) return;
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: reduceMotion ? motion.fast : motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flyKey, t, reduceMotion]);
  const from = mine ? BIG.h * 2 : -BIG.h * 1.5;
  const style = reduceMotion
    ? { opacity: t }
    : {
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
        ],
      };
  return (
    <Animated.View style={style} accessible accessibilityLabel={`On the pile: ${cardWords(card)}`}>
      <CardFace card={card} big />
    </Animated.View>
  );
}

// A card picked up from market slides into the hand, a little after the one before it.
function Arriving({ index, children }: { index: number; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      delay: index * gameMode.cardStaggerMs,
      duration: reduceMotion ? motion.fast : motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, index, reduceMotion]);
  const style = reduceMotion
    ? { opacity: t }
    : { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-CARD.h, 0] }) }] };
  return <Animated.View style={style}>{children}</Animated.View>;
}

type Props = {
  g: WhotPublic;
  hand: Card[] | null;
  gameKey: string;
  me: string;
  people: Person[];
  starter: boolean;
  pending: boolean;
  onMove: (move: WhotMove, guess?: (g: unknown, secret: unknown) => { g: unknown; secret: unknown } | null) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
  // The score for this sitting, and a fresh start (new teams, or the score from zero).
  score?: SetScore;
  onFresh?: () => void;
};

// Whot in game mode: the pile and the market in the middle, and your own hand at the bottom, seen only
// by you (play.md › Whot). Tap a card to lift it, tap it again to play it.
export function WhotBody({ g, hand, gameKey, me, people, starter, pending, onMove, onPlayAgain, onBackToTalking, score, onFresh }: Props) {
  const colors = useColors();
  const [choosing, setChoosing] = useState(false);
  const [lifted, setLifted] = useState<number | null>(null);
  const [handWidth, setHandWidth] = useState(0);
  const turnId = g.players[g.turn];
  const myTurn = !g.winner && turnId === me;
  const canAct = myTurn && !pending;
  // Your go ended (the time ran out): the shape question closes and the lifted card drops.
  useEffect(() => {
    if (!myTurn) setChoosing(false);
    setLifted(null);
  }, [myTurn, g.turnAt]);
  const name = (id: string) => (id === me ? 'You' : (people.find((p) => p.id === id)?.nickname ?? g.names[id] ?? 'Someone'));
  const topCard = g.pile[g.pile.length - 1];
  const playing = g.players.includes(me);
  useTurnCue(myTurn);
  useWinCue(!!g.winner);

  // A new card on the pile: it flies in with a card slap.
  const playedByMe = useRef(false);
  const pileSize = useRef(g.pile.length);
  const [fly, setFly] = useState({ key: 0, mine: false });
  useEffect(() => {
    if (g.pile.length > pileSize.current) {
      setFly((f) => ({ key: f.key + 1, mine: playedByMe.current }));
      playSound('card');
    }
    playedByMe.current = false;
    pileSize.current = g.pile.length;
  }, [g.pile.length]);

  // Cards arriving in your hand: from market (a card slide), or a "Pick two" hit (a firmer buzz).
  const handSize = useRef(hand?.length ?? 0);
  const [arrivedFrom, setArrivedFrom] = useState<number | null>(null);
  useEffect(() => {
    const n = hand?.length ?? 0;
    if (n > handSize.current && handSize.current > 0) {
      setArrivedFrom(handSize.current);
      playSound('market');
      if (n - handSize.current >= 2) buzz.medium();
    } else setArrivedFrom(null);
    handSize.current = n;
  }, [hand?.length]);

  const play = (card: Card, shape?: Shape) => {
    playedByMe.current = true;
    setLifted(null);
    const move: WhotMove = shape ? { type: 'play', card, shape } : { type: 'play', card };
    onMove(move, (current, secret) => {
      const now = current as WhotPublic;
      const cards = Array.isArray(secret) ? (secret as Card[]) : [];
      const at = cards.indexOf(card);
      if (at < 0) return null;
      return {
        g: {
          ...now,
          pile: [...now.pile, card],
          need: shape ?? null,
          counts: { ...now.counts, [me]: Math.max(0, (now.counts[me] ?? 1) - 1) },
        },
        secret: cards.filter((_, i) => i !== at),
      };
    });
  };

  const tapCard = (card: Card, i: number) => {
    if (!canAct || !canPlay(g, card)) return;
    if (lifted !== i) {
      buzz.light();
      setLifted(i);
      return;
    }
    if (parse(card).shape === 'whot') setChoosing(true);
    else play(card);
  };

  const cards = hand ?? [];
  // Cards overlap to fit, but each keeps at least a 44-point slice to tap; past that the hand slides sideways.
  const step =
    cards.length > 1 && handWidth > 0
      ? Math.max(size.minTarget, Math.min(CARD.w + space[2], (handWidth - CARD.w) / (cards.length - 1)))
      : CARD.w + space[2];
  const handSpan = cards.length > 0 ? (cards.length - 1) * step + CARD.w : 0;
  const turnText = g.winner
    ? `${name(g.winner)} won this game`
    : myTurn
      ? `Your go. You have ${TURN_SECONDS} seconds`
      : `${name(turnId)} is playing`;

  return (
    <GameStage
      kind="whot"
      gameKey={gameKey}
      score={score ? scoreLine(score, name) : null}
      turn={{ text: turnText, mine: myTurn }}
      faces={(id) => ({ dim: !g.players.includes(id) })}
      won={!!g.winner}
      board={({ width }) => (
        <View style={{ width, alignItems: 'center', gap: space[4] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2] }}>
            {g.players.map((id) => (
              <View
                key={id}
                accessible
                accessibilityLabel={`${name(id)}, ${g.counts[id]} cards${id === turnId ? ', playing now' : ''}`}
                style={{
                  paddingHorizontal: space[3],
                  minHeight: size.chip,
                  borderRadius: radius.pill,
                  borderWidth: border.selected,
                  borderColor: id === turnId && !g.winner ? colors.selectedBorder : 'transparent',
                  backgroundColor: colors.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[2],
                }}
              >
                <Text variant="metaStrong" numberOfLines={1}>
                  {name(id)}
                </Text>
                <Text variant="meta" color="textMeta" style={{ fontVariant: ['tabular-nums'] }}>{`${g.counts[id]}`}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[5] }}>
            <PileCard card={topCard} mine={fly.mine} flyKey={fly.key} />
            <View style={{ alignItems: 'center', gap: space[2] }} accessible accessibilityLabel={`Market, ${g.market} cards`}>
              <View style={{ width: CARD.w, height: CARD.h }}>
                {[2, 1, 0].map((k) => (
                  <View
                    key={k}
                    style={{
                      position: 'absolute',
                      left: k * space[1],
                      top: -k * space[1],
                      width: CARD.w,
                      height: CARD.h,
                      borderRadius: radius.small,
                      backgroundColor: colors.raised,
                      borderWidth: border.selected,
                      borderColor: colors.line,
                    }}
                  />
                ))}
              </View>
              <Text variant="meta" color="textMeta" style={{ fontVariant: ['tabular-nums'] }}>{`Market: ${g.market}`}</Text>
            </View>
          </View>
          {g.need ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Text variant="bodyStrong">I need:</Text>
              <ShapeMark shape={g.need} s={size.icon} color={colors.text} />
              <Text variant="bodyStrong">{`${SHAPE_NAME[g.need]}s`}</Text>
            </View>
          ) : null}
          {!g.winner ? (
            <Text variant="meta" color="textSoft" center numberOfLines={2}>
              {g.last}
            </Text>
          ) : null}
        </View>
      )}
      controls={
        g.winner ? (
          <GameOver
            result={setWinnerLine(score, name) ?? turnText}
            score={score ? { line: scoreLine(score, name), setWon: !!score.champion } : undefined}
            fresh={onFresh ? { label: 'Start the score again', onPress: onFresh } : undefined}
            canRestart={starter}
            onPlayAgain={onPlayAgain}
            onBackToTalking={onBackToTalking}
          />
        ) : !playing || !hand ? (
          <Text variant="meta" color="textSoft">
            {"You're watching this game. You can still talk."}
          </Text>
        ) : choosing ? (
          <View style={{ gap: space[2] }}>
            <Text variant="bodyStrong">Which shape do you want?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {SHAPES.map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask for ${SHAPE_NAME[s]}s`}
                  onPress={() => {
                    setChoosing(false);
                    play('whot-20', s);
                  }}
                  style={{
                    width: size.minTarget + space[2],
                    height: size.minTarget + space[2],
                    borderRadius: radius.small,
                    backgroundColor: colors.text,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShapeMark shape={s} s={size.icon} color={colors.bg} />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setChoosing(false)}
              style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text variant="bodyStrong" color="textSoft">
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: space[2] }}>
            {/* Your hand: a fanned row, overlapping when there are many. Only you see it. */}
            <ScrollView
              horizontal
              scrollEnabled={handSpan > handWidth}
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => setHandWidth(e.nativeEvent.layout.width)}
              style={{ height: CARD.h + LIFT, flexGrow: 0 }}
              accessibilityLabel={myTurn ? undefined : 'Your cards. Only you can see them.'}
            >
              <View style={{ width: handSpan, height: CARD.h + LIFT }}>
                {cards.map((card, i) => {
                  const ok = canAct && canPlay(g, card);
                  const up = lifted === i;
                  const face = (
                    <Pressable
                      accessibilityRole={myTurn ? 'button' : undefined}
                      accessibilityLabel={`${cardWords(card)}${ok ? (up ? ', tap again to play' : ', can play') : ''}`}
                      accessibilityState={{ disabled: !ok, selected: up }}
                      disabled={!ok}
                      onPress={() => tapCard(card, i)}
                      style={{ opacity: myTurn && !ok ? opacity.disabled : 1, transform: [{ translateY: up ? -LIFT : 0 }] }}
                    >
                      <CardFace card={card} />
                    </Pressable>
                  );
                  return (
                    <View key={`${card}-${i}`} style={{ position: 'absolute', left: i * step, bottom: 0, zIndex: up ? 1 : 0 }}>
                      {arrivedFrom !== null && i >= arrivedFrom ? <Arriving index={i - arrivedFrom}>{face}</Arriving> : face}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            {myTurn ? <TableAction label="Go to market" disabled={pending} onPress={() => onMove({ type: 'market' })} /> : null}
          </View>
        )
      }
    />
  );
}
