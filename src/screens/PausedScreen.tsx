import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ban } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import type { Ban as BanInfo } from '../lib/safety';
import { radius, size, space, useColors } from '../theme';

function when(until: string): string {
  const d = new Date(until);
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

// Account suspended or closed (docs/design/pages/removed-warned-suspended.md › 3). Firm, calm, never shaming.
export function PausedScreen({ ban, onLogOut, onDelete }: { ban: BanInfo; onLogOut: () => void; onDelete: () => void }) {
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: space.gutter, justifyContent: 'center', gap: space[5] }}>
        <View
          style={{
            width: size.avatarRoom,
            height: size.avatarRoom,
            borderRadius: radius.pill,
            backgroundColor: colors.dangerSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ban size={size.icon} color={colors.danger} strokeWidth={size.iconStroke} />
        </View>
        <Text variant="display" accessibilityRole="header">
          {ban.until ? 'Your account is paused' : 'Your account has been closed'}
        </Text>
        <Text variant="body" color="textSoft">
          {ban.until
            ? `Until ${when(ban.until)}, because of: ${ban.reason}.`
            : `Because of a serious breach of our rules: ${ban.reason}.`}
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4] }}>
          <Text variant="body">Be kind. Everyone in Circles is a real person.</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4] }}>
        <Button label="Log out" variant="quiet" onPress={onLogOut} />
        <Button label="Delete my account" variant="quiet" onPress={onDelete} />
      </View>
    </SafeAreaView>
  );
}
