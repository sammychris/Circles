import { View } from 'react-native';
import { Clapperboard, Radio, Trophy, Video } from 'lucide-react-native';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import { size, space, useColors } from '../../theme';

// Watch Together (Sammy, 2026-10-12): its own place, not part of the Table. Nothing here works yet:
// it lists what's planned (CIRCLES_INTENT.md › Watch Together), each only once there's approval or rights.
const PLANNED = [
  { Icon: Trophy, title: 'Watch games', line: 'Football and other matches, where we have the broadcasting rights' },
  { Icon: Radio, title: 'Live broadcasts and events', line: 'Watch live, together, when they are licensed' },
  { Icon: Video, title: 'Videos', line: 'Approved videos, with one person choosing what plays for everyone' },
  { Icon: Clapperboard, title: 'Films and creators', line: 'Screenings and premieres with the people who made them' },
];

export function WatchScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  return (
    <DoorLayout title="Watch together" line="Watch with a small group and talk about it. Coming soon." onBack={onBack}>
      <View style={{ gap: space[4] }}>
        {PLANNED.map(({ Icon, title, line }) => (
          <View key={title} accessible accessibilityLabel={`${title}. ${line}. Coming soon`} style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
            <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            <View style={{ flex: 1, gap: space[1] }}>
              <Text variant="bodyStrong">{title}</Text>
              <Text variant="meta" color="textSoft">
                {line}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="meta" color="textMeta">
        Rooms stay small, and your mic stays off until you tap it.
      </Text>
    </DoorLayout>
  );
}
