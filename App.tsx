import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import type { Session } from '@supabase/supabase-js';
import { Button } from './src/components/Button';
import { Text } from './src/components/Text';
import { missingConfig } from './src/config';
import { supabase } from './src/lib/supabase';
import { useProfile } from './src/lib/useProfile';
import { isAdult } from './src/lib/validation';
import { AgeScreen } from './src/screens/AgeScreen';
import { ConfigMissingScreen } from './src/screens/ConfigMissingScreen';
import { NicknameScreen } from './src/screens/NicknameScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { SignInFlow } from './src/screens/SignInFlow';
import { UnderAgeScreen } from './src/screens/UnderAgeScreen';
import { space, useColors } from './src/theme';

function Centered({ children }: { children?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.gutter, gap: space[4] }}>
      {children ?? <ActivityIndicator color={colors.textMeta} />}
    </View>
  );
}

function signOut() {
  void supabase.auth.signOut();
}

// Signed in: date of birth first, then a nickname, then the room. Nobody reaches the room without both.
function SignedIn({ session }: { session: Session }) {
  const { state, reload } = useProfile(session.user.id);

  if (state.status === 'loading') return <Centered />;
  if (state.status === 'error') {
    return (
      <Centered>
        <Text variant="body" color="textSoft" center>
          We couldn't load your account. Check that you're online.
        </Text>
        <Button label="Try again" onPress={() => void reload()} />
        <Button label="Log out" variant="quiet" onPress={signOut} />
      </Centered>
    );
  }

  const { nickname, dateOfBirth } = state.profile;
  if (!dateOfBirth) return <AgeScreen onSaved={() => void reload()} onBack={signOut} />;
  if (!isAdult(new Date(dateOfBirth))) return <UnderAgeScreen onClose={signOut} />;
  if (!nickname) return <NicknameScreen onSaved={() => void reload()} onBack={signOut} />;
  return <RoomScreen nickname={nickname} />;
}

export default function App() {
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

  // Step 1 test people signed in without an email. They have to sign in properly now.
  const oldTestSession = !!session && (session.user.is_anonymous || !session.user.email_confirmed_at);
  useEffect(() => {
    if (oldTestSession) signOut();
  }, [oldTestSession]);

  let content;
  if (!fontsLoaded || (missing.length === 0 && !sessionChecked)) content = <Centered />;
  else if (missing.length > 0) content = <ConfigMissingScreen missing={missing} />;
  else if (!session || oldTestSession) content = <SignInFlow />;
  else content = <SignedIn key={session.user.id} session={session} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
    </SafeAreaProvider>
  );
}
