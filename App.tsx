import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import type { Session } from '@supabase/supabase-js';
import { missingConfig } from './src/config';
import { supabase } from './src/lib/supabase';
import { ConfigMissingScreen } from './src/screens/ConfigMissingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { useColors } from './src/theme';

export default function App() {
  const colors = useColors();
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const missing = missingConfig();

  useEffect(() => {
    if (missing.length > 0) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [missing.length]);

  let content;
  if (!fontsLoaded || (missing.length === 0 && !sessionChecked)) {
    content = (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.textMeta} />
      </View>
    );
  } else if (missing.length > 0) {
    content = <ConfigMissingScreen missing={missing} />;
  } else if (!session) {
    content = <LoginScreen />;
  } else {
    const nickname = (session.user.user_metadata?.nickname as string | undefined) ?? 'Guest';
    content = <RoomScreen nickname={nickname} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
    </SafeAreaProvider>
  );
}
