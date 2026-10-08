import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, View } from 'react-native';
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
import { AddEmailFlow } from './src/screens/AddEmailFlow';
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

// Without an email, logging out loses the account for good, so ask first.
function confirmSignOut(hasEmail: boolean) {
  if (hasEmail) {
    signOut();
    return;
  }
  Alert.alert(
    'Log out?',
    "You won't be able to get this account or nickname back after you log out.",
    [
      { text: 'Stay', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ],
  );
}

// Signed in: date of birth first, then a nickname, then the room. Nobody reaches the room without both.
function SignedIn({ session }: { session: Session }) {
  const { state, reload } = useProfile(session.user.id);
  const [addingEmail, setAddingEmail] = useState(false);
  const [emailJustAdded, setEmailJustAdded] = useState(false);
  const hasEmail = !!session.user.email;

  if (state.status === 'loading') return <Centered />;
  if (state.status === 'error') {
    return (
      <Centered>
        <Text variant="body" color="textSoft" center>
          We couldn't load your account. Check that you're online.
        </Text>
        <Button label="Try again" onPress={() => void reload()} />
        <Button label="Log out" variant="quiet" onPress={() => confirmSignOut(hasEmail)} />
      </Centered>
    );
  }

  const { nickname, dateOfBirth } = state.profile;
  if (!dateOfBirth) return <AgeScreen onSaved={() => void reload()} onBack={signOut} />;
  // Stay signed in, so the same phone can't just try another date. Close leaves the app.
  if (!isAdult(new Date(dateOfBirth))) return <UnderAgeScreen onClose={() => BackHandler.exitApp()} />;
  if (!nickname) return <NicknameScreen onSaved={() => void reload()} onBack={signOut} />;
  if (addingEmail) {
    return (
      <AddEmailFlow
        onClose={() => setAddingEmail(false)}
        onAdded={() => {
          setAddingEmail(false);
          setEmailJustAdded(true);
        }}
      />
    );
  }
  return (
    <RoomScreen
      nickname={nickname}
      hasEmail={hasEmail}
      emailJustAdded={emailJustAdded}
      onAddEmail={() => setAddingEmail(true)}
      onLogOut={() => confirmSignOut(hasEmail)}
    />
  );
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

  let content;
  if (!fontsLoaded || (missing.length === 0 && !sessionChecked)) content = <Centered />;
  else if (missing.length > 0) content = <ConfigMissingScreen missing={missing} />;
  else if (!session) content = <SignInFlow />;
  else content = <SignedIn key={session.user.id} session={session} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
    </SafeAreaProvider>
  );
}
