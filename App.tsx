import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { StartScreen, type StartWhen } from './src/screens/StartScreen';
import { GroupScreen } from './src/screens/GroupScreen';
import type { Group } from './src/rooms/schedule';
import { clearReminders, onReminderTap } from './src/lib/reminders';
import { LearnSubjectScreen } from './src/screens/home/LearnSubjectScreen';
import { TalkDoorScreen } from './src/screens/home/TalkDoorScreen';
import { myBan, type Ban } from './src/lib/safety';
import { deleteMyAccount, type RoomRequest } from './src/rooms/api';
import { LegalModal } from './src/components/LegalModal';
import { PRIVACY, TERMS } from './src/content/legal';
import { parseLink, type LinkTarget } from './src/lib/links';
import type { RoomSummary } from './src/voice/useVoiceRoom';
import { SignInFlow } from './src/screens/SignInFlow';
import { TabBar, TabsProvider, type Tab } from './src/navigation/TabBar';
import { ExploreScreen } from './src/screens/tabs/ExploreScreen';
import { GroupsScreen } from './src/screens/tabs/GroupsScreen';
import { forgetVisits, rememberVisit } from './src/lib/roomHistory';
import { UnderAgeScreen } from './src/screens/UnderAgeScreen';
import { space, useColors } from './src/theme';

function Centered({ children }: { children?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.gutter, gap: space[4] }}
    >
      {children ?? <ActivityIndicator color={colors.textMeta} />}
    </View>
  );
}

// Logging out (or after deleting the account): this account's room history and reminders leave the phone too.
function signOut() {
  void supabase.auth
    .getSession()
    .then(async ({ data }) => {
      if (data.session) await forgetVisits(data.session.user.id);
      await clearReminders(data.session?.user.id ?? null);
    })
    .finally(() => void supabase.auth.signOut());
}

function confirmDeleteAccount() {
  Alert.alert('Delete your account?', 'Your nickname and everything tied to your account will be deleted. This can’t be undone.', [
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
  ]);
}

// Without an email, logging out loses the account for good, so ask first. `fromMe`: the warning can
// point to Add your email, which is right there.
function confirmSignOut(hasEmail: boolean, fromMe = false) {
  if (hasEmail) {
    signOut();
    return;
  }
  Alert.alert(
    'Log out?',
    fromMe
      ? "You won't be able to get this account or nickname back after you log out. To keep it, tap Stay, then Add your email."
      : "You won't be able to get this account or nickname back after you log out.",
    [
      { text: 'Stay', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ],
  );
}

type Screen =
  | { name: 'home' }
  | { name: 'door'; door: DoorName }
  | { name: 'me'; notice?: string }
  | { name: 'explore' }
  | { name: 'groups'; notice?: string }
  | { name: 'group'; groupId: string; first?: Group; from: 'explore' | 'groups' }
  | { name: 'addEmail' }
  | {
      name: 'start';
      door: 'talk' | 'play' | 'learn';
      subject?: string;
      draft?: Extract<RoomRequest, { kind: 'create' }>;
      // Opened from a tab page (Back returns there, and Talk or Play can be chosen).
      from?: 'explore' | 'groups';
      when?: StartWhen;
    }
  | { name: 'learn'; subject: string }
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
  // A reminder tapped on the lock screen: its room opens once the person is ready, like a link.
  const [reminderRequest, setReminderRequest] = useState<RoomRequest | null>(null);
  const hasEmail = !!session.user.email;
  const colors = useColors();
  // Each main page registers how to scroll itself to the top, for a second tap on its tab.
  const scrollers = useRef(new Map<Tab, () => void>());
  const tabs = useMemo(
    () => ({
      register: (t: Tab, toTop: () => void) => {
        scrollers.current.set(t, toTop);
        return () => {
          if (scrollers.current.get(t) === toTop) scrollers.current.delete(t);
        };
      },
    }),
    [],
  );

  useEffect(() => onReminderTap((scheduledId) => setReminderRequest({ kind: 'scheduled', scheduledId })), []);

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
  useEffect(() => {
    if (!ready || busy || !reminderRequest) return;
    setScreen({ name: 'room', request: reminderRequest, visit: Date.now() });
    setReminderRequest(null);
  }, [ready, busy, reminderRequest]);

  // Android back button: back to Home from any page. In a room it does nothing, so voice isn't lost by accident.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') return false;
      if (screen.name === 'room') return true;
      // Back returns to where you came from.
      if (screen.name === 'start' && screen.from) setScreen({ name: screen.from } as Screen);
      else if (screen.name === 'group') setScreen({ name: screen.from } as Screen);
      else if (screen.name === 'start')
        setScreen(screen.door === 'learn' ? { name: 'learn', subject: screen.subject ?? '' } : { name: 'door', door: screen.door });
      else if (screen.name === 'learn') setScreen({ name: 'door', door: 'learn' });
      else if (screen.name === 'addEmail') setScreen({ name: 'me' });
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

  // The bottom bar (docs/design/pages/tabs.md): on the four main pages and the pages opened from
  // them; hidden in rooms, after a room, Start something and adding an email.
  const tab: Tab | null =
    screen.name === 'home' || screen.name === 'door' || screen.name === 'learn'
      ? 'home'
      : screen.name === 'explore' || screen.name === 'groups' || screen.name === 'me'
        ? screen.name
        : screen.name === 'group'
          ? screen.from
          : null;
  const page = renderPage();
  if (!tab) return page;
  return (
    <TabsProvider value={tabs}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1 }}>{page}</View>
        <TabBar
          current={tab}
          me={me}
          onSelect={(t) => setScreen({ name: t } as Screen)}
          onReselect={(t) => {
            // Tapping Home again from a door page goes back to Home itself.
            if (t === 'home' && screen.name !== 'home') home();
            else scrollers.current.get(t)?.();
          }}
        />
      </View>
    </TabsProvider>
  );

  function renderPage() {
    switch (screen.name) {
      case 'room':
        return (
          <RoomScreen
            key={screen.visit}
            me={me}
            request={screen.request}
            onLeft={(summary) => {
              const request = screen.request;
              // For Home's "Go back in" and "For you", kept on this phone (never support rooms).
              if (summary) void rememberVisit(me.id, summary.room);
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
            email={session.user.email ?? null}
            notice={screen.notice}
            onOpenPeople={() => setScreen({ name: 'door', door: 'people' })}
            onAddEmail={() => setScreen({ name: 'addEmail' })}
            onLogOut={() => confirmSignOut(hasEmail, true)}
            onDelete={confirmDeleteAccount}
          />
        );
      case 'addEmail':
        return (
          <AddEmailFlow
            onClose={() => setScreen({ name: 'me' })}
            onAdded={() => setScreen({ name: 'me', notice: 'Email added. Your account is safe.' })}
          />
        );
      case 'learn':
        return (
          <LearnSubjectScreen
            subjectId={screen.subject}
            onBack={() => setScreen({ name: 'door', door: 'learn' })}
            onEnter={enter}
            onStart={() => setScreen({ name: 'start', door: 'learn', subject: screen.subject })}
          />
        );
      case 'start':
        return (
          <StartScreen
            door={screen.door}
            subject={screen.subject}
            draft={screen.draft}
            chooseDoor={!!screen.from}
            when={screen.when}
            onScheduled={(notice) => setScreen({ name: 'groups', notice })}
            onBack={() =>
              setScreen(
                screen.from
                  ? ({ name: screen.from } as Screen)
                  : screen.door === 'learn'
                    ? { name: 'learn', subject: screen.subject ?? screen.draft?.language ?? '' }
                    : { name: 'door', door: screen.door },
              )
            }
            onStart={enter}
          />
        );
      case 'door':
        if (screen.door === 'talk') {
          return (
            <TalkDoorScreen
              nickname={me.nickname}
              onBack={home}
              onEnter={enter}
              onStart={() => setScreen({ name: 'start', door: 'talk' })}
            />
          );
        }
        if (screen.door === 'support') return <SupportDoorScreen onBack={home} onEnter={enter} />;
        if (screen.door === 'play') {
          return <PlayDoorScreen onBack={home} onEnter={enter} onStart={() => setScreen({ name: 'start', door: 'play' })} />;
        }
        if (screen.door === 'people') return <PeopleScreen nickname={me.nickname} onBack={home} onEnter={enter} />;
        return <LearnScreen onBack={home} onEnter={enter} onOpenSubject={(subject) => setScreen({ name: 'learn', subject })} />;
      case 'group':
        return (
          <GroupScreen
            me={me}
            groupId={screen.groupId}
            first={screen.first}
            backLabel={screen.from === 'explore' ? 'Back to Explore' : 'Back to Groups'}
            onBack={() => setScreen({ name: screen.from } as Screen)}
            onEnter={enter}
          />
        );
      case 'explore':
        return (
          <ExploreScreen
            me={me}
            onEnter={enter}
            // Learn rooms start from a language or skill, so that one opens the Learn door.
            onStart={(door, later) =>
              setScreen(
                door === 'learn'
                  ? { name: 'door', door: 'learn' }
                  : { name: 'start', door, from: 'explore', when: later ? 'later' : 'now' },
              )
            }
            onOpenGroup={(g) => setScreen({ name: 'group', groupId: g.id, first: g, from: 'explore' })}
          />
        );
      case 'groups':
        return (
          <GroupsScreen
            key={screen.notice ?? 'groups'}
            me={me}
            nickname={me.nickname}
            notice={screen.notice}
            onStartGroup={() => setScreen({ name: 'start', door: 'talk', from: 'groups', when: 'weekly' })}
            onOpenGroup={(g) => setScreen({ name: 'group', groupId: g.id, first: g, from: 'groups' })}
            onEnter={enter}
            onExplore={() => setScreen({ name: 'explore' })}
            onOpenPeople={() => setScreen({ name: 'door', door: 'people' })}
          />
        );
      default:
        return (
          <>
            <HomeScreen
              me={me}
              onOpen={(door) => setScreen({ name: 'door', door })}
              onEnter={enter}
              onExplore={() => setScreen({ name: 'explore' })}
            />
          </>
        );
    }
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
        pendingRequest={
          link.roomId ? { kind: 'join', roomId: link.roomId } : linkEnded ? { kind: 'match', door: 'talk', mood: null } : null
        }
        onPendingUsed={clearLink}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
      <LegalModal doc={link.page === 'privacy' ? PRIVACY : link.page === 'terms' ? TERMS : null} onClose={clearLink} />
    </SafeAreaProvider>
  );
}
