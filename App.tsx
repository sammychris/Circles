import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// One file per weight, so only the three weights Circles uses are bundled (not all eighteen).
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
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
import { AfterRoomScreen } from './src/screens/AfterRoomScreen';
import { PausedScreen } from './src/screens/PausedScreen';
import { HomeScreen, type DoorName } from './src/screens/home/HomeScreen';
import { LearnScreen } from './src/screens/home/LearnScreen';
import { MeScreen } from './src/screens/home/MeScreen';
import { PeopleScreen } from './src/screens/home/PeopleScreen';
import { PlayDoorScreen } from './src/screens/home/PlayDoorScreen';
import { SupportDoorScreen } from './src/screens/home/SupportDoorScreen';
import { StartScreen } from './src/screens/StartScreen';
import { TalkDoorScreen } from './src/screens/home/TalkDoorScreen';
import { Toast } from './src/components/Toast';
import { myBan, type Ban } from './src/lib/safety';
import { deleteMyAccount, type RoomRequest } from './src/rooms/api';
import { LegalModal } from './src/components/LegalModal';
import { PRIVACY, TERMS } from './src/content/legal';
import { parseLink, type LinkTarget } from './src/lib/links';
import type { RoomSummary } from './src/voice/useVoiceRoom';
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

function confirmDeleteAccount() {
  Alert.alert(
    'Delete your account?',
    'Your nickname and everything tied to your account will be deleted. This can’t be undone.',
    [
      { text: 'Keep my account', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteMyAccount()
            .then(signOut)
            .catch(() => Alert.alert("We couldn't delete it", "Check that you're online, then try again."));
        },
      },
    ],
  );
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

type Screen =
  | { name: 'home' }
  | { name: 'door'; door: DoorName }
  | { name: 'me' }
  | { name: 'addEmail' }
  | { name: 'start'; door: 'talk' | 'play'; draft?: Extract<RoomRequest, { kind: 'create' }> }
  | { name: 'room'; request: RoomRequest; visit: number }
  | { name: 'after'; summary: RoomSummary };

// Signed in: date of birth first, then a nickname, then the house. Nobody reaches a room without both.
function SignedIn({
  session,
  pendingRequest,
  onPendingUsed,
}: {
  session: Session;
  // A room to open as soon as the person is ready (from a room link).
  pendingRequest: RoomRequest | null;
  onPendingUsed: () => void;
}) {
  const { state, reload } = useProfile(session.user.id);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [ban, setBan] = useState<Ban | null>(null);
  // A room link waits until we know whether the account is paused.
  const [banChecked, setBanChecked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const hasEmail = !!session.user.email;

  useEffect(() => {
    void myBan()
      .then(setBan)
      .catch(() => {})
      .finally(() => setBanChecked(true));
  }, []);

  // Opened from a room link: go straight into that room once they have a nickname and passed 18+.
  const ready =
    state.status === 'ready' &&
    !!state.profile.nickname &&
    !!state.profile.dateOfBirth &&
    isAdult(new Date(state.profile.dateOfBirth)) &&
    banChecked &&
    !ban;
  // A link opened while in a room, or on the after-room screen, waits until they're back home:
  // nobody is pulled out of a room without choosing to leave.
  const busy = screen.name === 'room' || screen.name === 'after';
  useEffect(() => {
    if (!ready || busy || !pendingRequest) return;
    setScreen({ name: 'room', request: pendingRequest, visit: Date.now() });
    onPendingUsed();
  }, [ready, busy, pendingRequest, onPendingUsed]);

  // Android back button: back to Home from any page. In a room it does nothing, so voice isn't lost by accident.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') return false;
      if (screen.name === 'room') return true;
      if (screen.name === 'start') setScreen({ name: 'door', door: screen.door });
      else setScreen({ name: 'home' });
      return true;
    });
    return () => sub.remove();
  }, [screen]);

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
  if (ban) return <PausedScreen ban={ban} onLogOut={() => confirmSignOut(hasEmail)} onDelete={confirmDeleteAccount} />;

  const me = { id: session.user.id, nickname };
  const home = () => setScreen({ name: 'home' });
  const enter = (request: RoomRequest) => setScreen({ name: 'room', request, visit: Date.now() });

  switch (screen.name) {
    case 'room':
      return (
        <RoomScreen
          key={screen.visit}
          me={me}
          request={screen.request}
          onLeft={(summary) => {
            const request = screen.request;
            if (summary) setScreen({ name: 'after', summary });
            // A room that never started: back to the form, with what they typed still there.
            else if (request.kind === 'create') setScreen({ name: 'start', door: request.door, draft: request });
            else home();
            void myBan()
              .then(setBan)
              .catch(() => {});
          }}
          onMove={enter}
        />
      );
    case 'after':
      return <AfterRoomScreen me={me} summary={screen.summary} onDone={home} />;
    case 'me':
      return (
        <MeScreen
          me={me}
          hasEmail={hasEmail}
          onBack={home}
          onAddEmail={() => setScreen({ name: 'addEmail' })}
          onLogOut={() => confirmSignOut(hasEmail)}
          onDelete={confirmDeleteAccount}
        />
      );
    case 'addEmail':
      return (
        <AddEmailFlow
          onClose={() => setScreen({ name: 'me' })}
          onAdded={() => {
            setToast('Email added. Your account is safe.');
            setScreen({ name: 'me' });
          }}
        />
      );
    case 'start':
      return (
        <StartScreen
          door={screen.door}
          draft={screen.draft}
          onBack={() => setScreen({ name: 'door', door: screen.door })}
          onStart={enter}
        />
      );
    case 'door':
      if (screen.door === 'talk') {
        return (
          <TalkDoorScreen nickname={nickname} onBack={home} onEnter={enter} onStart={() => setScreen({ name: 'start', door: 'talk' })} />
        );
      }
      if (screen.door === 'support') return <SupportDoorScreen onBack={home} onEnter={enter} />;
      if (screen.door === 'play') {
        return <PlayDoorScreen onBack={home} onEnter={enter} onStart={() => setScreen({ name: 'start', door: 'play' })} />;
      }
      if (screen.door === 'people') return <PeopleScreen onBack={home} />;
      return <LearnScreen onBack={home} onEnter={enter} />;
    default:
      return (
        <>
          <HomeScreen me={me} onOpen={(door) => setScreen({ name: 'door', door })} onOpenMe={() => setScreen({ name: 'me' })} />
          <Toast message={toast} onDone={() => setToast(null)} />
        </>
      );
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const missing = missingConfig();
  // A room link or legal page this app was opened with (web address, or circles:// on phones).
  const [link, setLink] = useState<LinkTarget>(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' ? parseLink(window.location.href) : {},
  );
  const [linkEnded, setLinkEnded] = useState(false);
  const clearLink = useCallback(() => {
    setLink({});
    setLinkEnded(false);
    // So reloading the page doesn't join the room again.
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState(null, '', '/');
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Linking.getInitialURL().then((url) => {
      const target = parseLink(url);
      if (target.roomId || target.page) setLink(target);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const target = parseLink(url);
      if (target.roomId || target.page) setLink(target);
    });
    return () => sub.remove();
  }, []);

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
  else if (!session) {
    content = (
      <SignInFlow
        linkRoom={link.roomId ? { roomId: link.roomId, by: link.by } : undefined}
        onLinkEnded={() => {
          setLink({});
          setLinkEnded(true);
        }}
      />
    );
  } else {
    content = (
      <SignedIn
        key={session.user.id}
        session={session}
        pendingRequest={link.roomId ? { kind: 'join', roomId: link.roomId } : linkEnded ? { kind: 'match', door: 'talk', mood: null } : null}
        onPendingUsed={clearLink}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
      <LegalModal
        doc={link.page === 'privacy' ? PRIVACY : link.page === 'terms' ? TERMS : null}
        onClose={clearLink}
      />
    </SafeAreaProvider>
  );
}
