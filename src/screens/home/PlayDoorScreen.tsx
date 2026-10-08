import { View } from 'react-native';
import { Dice5 } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import type { RoomRequest } from '../../rooms/api';
import { doorColors, radius, size, space, useColors } from '../../theme';

// "Let's play" (docs/design/pages/doors.md › I'm bored). Games not yet available are not shown.
export function PlayDoorScreen({ onBack, onEnter }: { onBack: () => void; onEnter: (r: RoomRequest) => void }) {
  const colors = useColors();
  return (
    <DoorLayout
      title="Let's play"
      line="The game is the excuse. The talking is the fun."
      onBack={onBack}
      footer={
        <>
          <Button label="Play now" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'play', mood: null })} />
          <Text variant="meta" color="textMeta" center>
            We'll put you in a game room with free seats
          </Text>
        </>
      }
    >
      <View style={{ gap: space[3] }}>
        <Text variant="heading">Board games</Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: space[4],
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[4],
          }}
        >
          <View
            style={{
              width: size.tileIconBox,
              height: size.tileIconBox,
              borderRadius: radius.small,
              backgroundColor: doorColors.play.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Dice5 size={size.iconButton20} color={doorColors.play.fg} strokeWidth={size.iconStroke} />
          </View>
          <View style={{ flex: 1, gap: space[1] }}>
            <Text variant="bodyStrong">Ludo</Text>
            <Text variant="meta" color="textSoft">
              In two teams, while you all talk
            </Text>
          </View>
        </View>
        <Text variant="meta" color="textMeta">
          In a game room, tap Play Ludo once three or more people are there.
        </Text>
      </View>
    </DoorLayout>
  );
}
