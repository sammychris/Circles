import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { border, opacity, radius, size, space, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameOver } from '../shared/GameOver';
import { SHAPES, TURN_SECONDS, canPlay, parse, type Card, type Shape, type WhotMove, type WhotPublic } from './engine';

const CARD = { w: size.avatarRoom - space[2], h: size.avatarRoom + space[4] };
const BIG = { w: size.avatarRoom + space[5], h: size.avatarRoom * 1.5 };

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

const SHAPE_NAME: Record<Shape | 'whot', string> = { circle: 'circle', triangle: 'triangle', cross: 'cross', square: 'square', star: 'star', whot: 'Whot' };

function CardFace({ card, big, playable, onPress }: { card: Card; big?: boolean; playable?: boolean; onPress?: () => void }) {
  const colors = useColors();
  const c = parse(card);
  const dims = big ? BIG : CARD;
  const label = c.shape === 'whot' ? 'Whot 20' : `${SHAPE_NAME[c.shape]} ${c.n}`;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}${playable ? ', can play' : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        width: dims.w,
        height: dims.h,
        borderRadius: radius.small,
        backgroundColor: colors.text,
        borderWidth: playable ? border.selected : 0,
        borderColor: colors.live,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space[1],
        opacity: onPress && !playable ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      <Text variant={big ? 'heading' : 'metaStrong'} style={{ color: colors.bg }}>
        {String(c.n)}
      </Text>
      <ShapeMark shape={c.shape} s={big ? size.icon * 1.5 : size.icon} color={colors.bg} />
      <View />
    </Pressable>
  );
}

type Props = {
  g: WhotPublic;
  hand: Card[] | null;
  me: string;
  people: Person[];
  starter: boolean;
  onMove: (move: WhotMove) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Whot on the table: the pile and "I need" in the middle, everyone's card count, and your own hand at
// the bottom, seen only by you (play.md › Whot).
export function WhotBody({ g, hand, me, people, starter, onMove, onPlayAgain, onBackToTalking }: Props) {
  const colors = useColors();
  const [choosing, setChoosing] = useState(false);
  const turnId = g.players[g.turn];
  const myTurn = !g.winner && turnId === me;
  const name = (id: string) => (id === me ? 'You' : people.find((p) => p.id === id)?.nickname ?? g.names[id] ?? 'Someone');
  const topCard = g.pile[g.pile.length - 1];
  const playing = g.players.includes(me);

  return (
    <View style={{ gap: space[4] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {g.players.map((id) => (
          <View
            key={id}
            accessible
            accessibilityLabel={`${name(id)}, ${g.counts[id]} cards${id === turnId ? ', playing now' : ''}`}
            style={{
              paddingHorizontal: space[3],
              minHeight: size.minTarget,
              borderRadius: radius.pill,
              borderWidth: border.selected,
              borderColor: id === turnId && !g.winner ? colors.live : 'transparent',
              backgroundColor: colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
            }}
          >
            <Text variant="metaStrong" color={id === turnId && !g.winner ? 'live' : 'text'}>
              {name(id)}
            </Text>
            <Text variant="meta" color="textMeta" style={{ fontVariant: ['tabular-nums'] }}>{`${g.counts[id]} cards`}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[5] }}>
        <CardFace card={topCard} big />
        <View style={{ gap: space[1] }}>
          {g.need ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Text variant="bodyStrong">I need:</Text>
              <ShapeMark shape={g.need} s={size.icon} color={colors.text} />
              <Text variant="bodyStrong">{`${SHAPE_NAME[g.need]}s`}</Text>
            </View>
          ) : null}
          <Text variant="meta" color="textMeta">{`Market: ${g.market} cards`}</Text>
        </View>
      </View>

      {g.winner ? (
        <GameOver result={`${name(g.winner)} won this game`} canRestart={starter} onPlayAgain={onPlayAgain} onBackToTalking={onBackToTalking} />
      ) : (
        <>
          <Text variant="heading" accessibilityLiveRegion="polite">
            {g.last}
          </Text>
          {playing && hand ? (
            <View style={{ gap: space[2] }}>
              <Text variant="metaStrong" color="textMeta">
                {myTurn ? `Your go. You have ${TURN_SECONDS} seconds.` : `${name(turnId)} is playing. Only you can see your cards.`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingVertical: space[1] }}>
                {hand.map((card, i) => {
                  const ok = myTurn && canPlay(g, card);
                  return (
                    <CardFace
                      key={`${card}-${i}`}
                      card={card}
                      playable={ok}
                      onPress={myTurn ? () => (ok ? (parse(card).shape === 'whot' ? setChoosing(true) : onMove({ type: 'play', card })) : undefined) : undefined}
                    />
                  );
                })}
              </ScrollView>
              {choosing ? (
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
                          onMove({ type: 'play', card: 'whot-20', shape: s });
                        }}
                        style={{ width: size.minTarget + space[2], height: size.minTarget + space[2], borderRadius: radius.small, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ShapeMark shape={s} s={size.icon} color={colors.bg} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {myTurn ? <TableAction label="Go to market" onPress={() => onMove({ type: 'market' })} /> : null}
            </View>
          ) : (
            <Text variant="meta" color="textSoft">
              {"You're watching this game. You can still talk."}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
