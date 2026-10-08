import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Eye, MonitorUp } from 'lucide-react-native';
import type { VideoTrack } from 'livekit-client';
import type { TableItem } from '../../table/model';
import { radius, size, space, useColors } from '../../theme';
import { TableAction } from '../TableAction';
import { Text } from '../Text';
import { ScreenView } from './ScreenView';

type Props = {
  item: Extract<TableItem, { kind: 'screen' }>;
  mine: boolean;
  // The presenter's screen, once this person chose to watch it.
  track: VideoTrack | undefined;
  onWatch: (on: boolean) => void;
  onStop: () => void;
};

// Share my screen: live, like a WhatsApp call. Hidden until each person taps (it uses data, and
// nobody should be shown something they didn't choose to see).
export function ScreenBody({ item, mine, track, onWatch, onStop }: Props) {
  const colors = useColors();
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    if (mine) return;
    onWatch(watching);
    // Stop downloading the screen when this card goes away.
    return () => onWatch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching, mine]);

  if (mine) {
    return (
      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <MonitorUp size={size.icon} color={colors.live} strokeWidth={size.iconStroke} />
          <Text variant="heading" style={{ flex: 1 }}>
            Everyone can see your screen
          </Text>
        </View>
        <Text variant="body" color="textSoft">
          Messages that pop up show too. Go to the app or photo you want to show, then come back here to stop.
        </Text>
        <TableAction label="Stop sharing" onPress={onStop} />
      </View>
    );
  }

  return (
    <View style={{ gap: space[3] }}>
      <View style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.small, overflow: 'hidden', backgroundColor: colors.bg }}>
        {watching && track ? (
          <ScreenView track={track} />
        ) : watching ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="meta" color="textSoft">
              Connecting to the screen…
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tap to see ${item.byName}'s screen. Uses mobile data`}
            onPress={() => setWatching(true)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ backgroundColor: colors.scrim, borderRadius: radius.pill, paddingHorizontal: space[4], minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Eye size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
              <Text variant="bodyStrong">Tap to see</Text>
            </View>
          </Pressable>
        )}
      </View>
      {watching ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setWatching(false)}
          style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="bodyStrong" color="textSoft">
            Stop watching
          </Text>
        </Pressable>
      ) : (
        <Text variant="meta" color="textMeta" center>
          It's live, so there's nothing to look back on.
        </Text>
      )}
    </View>
  );
}
