import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react-native';
import type { TableItem, TableState } from '../../table/model';
import { opacity, radius, size, space, useColors } from '../../theme';
import { TableAction } from '../TableAction';
import { Text } from '../Text';

type Props = {
  item: Extract<TableItem, { kind: 'photos' }>;
  state: TableState;
  mine: boolean;
  onPresent: (change: Omit<TableState, 'seq'>) => void;
};

function Arrow({ dir, disabled, onPress }: { dir: 'back' | 'next'; disabled: boolean; onPress: () => void }) {
  const colors = useColors();
  const Icon = dir === 'back' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? 'Previous photo' : 'Next photo'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size.iconButton,
        height: size.iconButton,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      <Icon size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
    </Pressable>
  );
}

// Photo slides, like a projector: the presenter moves through them for everyone. Each person can go
// back on their own and tap "Back to live" to catch up. Hidden until each person taps (activities.md).
export function PhotosBody({ item, state, mine, onPresent }: Props) {
  const colors = useColors();
  const count = item.photos.length;
  const live = Math.min(state.index ?? 0, count - 1);
  // A viewer's own place, when they look back; null means following the presenter.
  const [own, setOwn] = useState<number | null>(null);
  const [seen, setSeen] = useState(mine);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const shown = mine ? live : own ?? live;
  useEffect(() => {
    // Caught up by themselves: following again.
    if (own !== null && own === live) setOwn(null);
  }, [own, live]);

  const go = (to: number) => {
    const next = Math.min(Math.max(to, 0), count - 1);
    if (mine) onPresent({ index: next });
    else setOwn(next === live ? null : next);
  };
  const photo = item.photos[shown];

  return (
    <View style={{ gap: space[3] }}>
      <View style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.small, overflow: 'hidden', backgroundColor: colors.bg }}>
        {/* Nothing is drawn until the person taps: a blur can still show too much. */}
        {!seen ? null : failed.has(shown) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[4] }}>
            <Text variant="meta" color="textSoft" center>
              This photo didn't load. It may have expired.
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: photo.url }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel={`Photo ${shown + 1} of ${count}, shared by ${item.byName}`}
            onError={() => setFailed((f) => new Set(f).add(shown))}
            style={{ width: '100%', height: '100%' }}
          />
        )}
        {!seen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tap to see ${item.byName}'s photos`}
            onPress={() => setSeen(true)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ backgroundColor: colors.scrim, borderRadius: radius.pill, paddingHorizontal: space[4], minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Eye size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
              <Text variant="bodyStrong">Tap to see</Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Arrow dir="back" disabled={!seen || shown === 0} onPress={() => go(shown - 1)} />
        <Text variant="metaStrong" color="textSoft" center style={{ flex: 1, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
          {mine ? `Showing ${shown + 1} of ${count} to everyone` : own !== null ? `You're on ${shown + 1} of ${count}` : `${shown + 1} of ${count}`}
        </Text>
        <Arrow dir="next" disabled={!seen || shown === count - 1} onPress={() => go(shown + 1)} />
      </View>
      {!mine && own !== null ? <TableAction label="Back to live" onPress={() => setOwn(null)} /> : null}
      {!mine && own === null && seen ? (
        <Text variant="meta" color="textMeta" center>
          {`Following ${item.byName}. Use the arrows to look back.`}
        </Text>
      ) : null}
    </View>
  );
}
