import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space, useColors } from '../theme';
import { Text } from '../components/Text';

export function ConfigMissingScreen({ missing }: { missing: string[] }) {
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: space.gutter, justifyContent: 'center', gap: space[4] }}>
        <Text variant="title">Circles isn't connected yet</Text>
        <Text variant="body" color="textSoft">
          This build is missing the settings that connect it to Supabase and LiveKit. Ask Claude to walk you through adding them.
        </Text>
        <View style={{ gap: space[1] }}>
          {missing.map((name) => (
            <Text key={name} variant="meta" color="textMeta">
              {name}
            </Text>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
