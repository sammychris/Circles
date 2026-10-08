import { Pressable, View } from 'react-native';
import { ChevronRight, Search } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import type { RoomRequest } from '../../rooms/api';
import { moodColors, opacity, radius, size, space, useColors } from '../../theme';

// "Let's play" (docs/screens/10-lets-play.png, doors.md › I'm bored). Games not yet available are not shown.
export function PlayDoorScreen({ onBack, onEnter }: { onBack: () => void; onEnter: (r: RoomRequest) => void }) {
  const colors = useColors();
  const playNow = () => onEnter({ kind: 'match', door: 'play', mood: null });
  return (
    <DoorLayout title="Let's play" line="Games are the excuse. Talking is the fun." onBack={onBack}>
      <View style={{ gap: space[3] }}>
        <Button label="Play now" variant="primary" onPress={playNow} />
        <Text variant="meta" color="textMeta" center>
          We'll find you a game with free seats
        </Text>
      </View>

      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="heading">Talk games</Text>
          <Text variant="meta" color="textSoft">
            The talking is the game
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Find the Impostor. 3 to 6 people. Opens a game room."
          onPress={playNow}
          style={({ pressed }) => ({
            minHeight: size.avatarRoom,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[4],
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <View
            style={{
              width: size.tileIconBox,
              height: size.tileIconBox,
              borderRadius: radius.small,
              backgroundColor: moodColors.laugh.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search size={size.iconButton20} color={moodColors.laugh.fg} strokeWidth={size.iconStroke} />
          </View>
          <View style={{ flex: 1, gap: space[1] }}>
            <Text variant="bodyStrong">Find the Impostor</Text>
            <Text variant="meta" color="textSoft">
              3 to 6 people
            </Text>
          </View>
          <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
        </Pressable>
      </View>

      <View style={{ gap: space[3] }}>
        <Text variant="heading">Board and card games</Text>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ludo. In teams. Opens a game room."
            onPress={playNow}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: space[4],
              gap: space[1],
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <Text variant="heading">Ludo</Text>
            <Text variant="meta" color="textSoft">
              In teams
            </Text>
          </Pressable>
          {/* Keeps Ludo half width, as in the design's 2 × 2 grid; more games fill this space later. */}
          <View style={{ flex: 1 }} />
        </View>
        <Text variant="meta" color="textMeta">
          In a game room, tap Play a game and pick one once three people are there.
        </Text>
      </View>
    </DoorLayout>
  );
}
