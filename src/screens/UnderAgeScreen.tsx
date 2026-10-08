import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { YOUTH_HELPLINE } from '../content/helplines';
import { radius, size, space, useColors } from '../theme';

// Shown instead of the app to anyone under 18. Kind, never blaming, with somewhere to turn.
export function UnderAgeScreen({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: space.gutter, justifyContent: 'center', gap: space[5] }}>
        <View
          style={{
            alignSelf: 'center',
            width: size.avatarRoom,
            height: size.avatarRoom,
            borderRadius: radius.pill,
            backgroundColor: colors.raised,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart size={size.icon} color={colors.helpIcon} strokeWidth={size.iconStroke} />
        </View>
        <Text variant="title" center accessibilityRole="header">
          Circles is for adults
        </Text>
        <Text variant="body" color="textSoft" center>
          {YOUTH_HELPLINE
            ? "You need to be 18 or older to use Circles. If you're going through something hard, you can still talk to someone:"
            : "You need to be 18 or older to use Circles. If you're going through something hard, please talk to an adult you trust, like a parent, teacher or family member."}
        </Text>
        {YOUTH_HELPLINE ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4] }}>
            <Text variant="bodyStrong" center>
              {YOUTH_HELPLINE}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4] }}>
        <Button label="Close" variant="primary" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}
