import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { TEST_ACCOUNTS } from '../config';
import { supabase } from '../lib/supabase';
import { size, space, useColors } from '../theme';

// Step 1 only: three test people instead of a real login. Real phone login arrives in Step 2.
export function LoginScreen() {
  const colors = useColors();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function signInAs(nickname: string) {
    setBusy(nickname);
    setFailed(false);
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { nickname } } });
    if (error || !data.user) {
      setFailed(true);
      setBusy(null);
      return;
    }
    // The profile holds only the chosen nickname. If this fails the room still works.
    await supabase.from('profiles').upsert({ id: data.user.id, nickname });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: space.gutter, paddingTop: space[7], gap: space[6] }}>
        <View style={{ gap: space[2] }}>
          <Text variant="display">Who's testing?</Text>
          <Text variant="body" color="textSoft">
            Pick a different test person on each phone. Real sign-in comes later.
          </Text>
        </View>
        <View style={{ gap: space[3] }}>
          {TEST_ACCOUNTS.map((name) => (
            <Button
              key={name}
              label={name}
              loading={busy === name}
              disabled={busy !== null && busy !== name}
              onPress={() => void signInAs(name)}
              style={{ minHeight: size.buttonPrimary }}
            />
          ))}
        </View>
        {failed ? (
          <Text variant="meta" color="danger" accessibilityLiveRegion="polite">
            We couldn't sign you in. Check your connection and try again.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
