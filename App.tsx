import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Linking, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { isAdult, realEmail } from './src/lib/validation';
import { PasswordScreen } from './src/screens/PasswordScreen';
import { AddEmailFlow } from './src/screens/AddEmailFlow';
import { AgeScreen } from './src/screens/AgeScreen';
import { ConfigMissingScreen } from './src/screens/ConfigMissingScreen';
import { NicknameScreen } from './src/screens/NicknameScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { BlockedScreen, EditProfileScreen, HelpContactScreen, ManageAccountScreen, NotificationsScreen } from './src/screens/MePages';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { HostApplyScreen } from './src/screens/HostApplyScreen';
import { HostToolsScreen } from './src/screens/HostToolsScreen';
import { AfterRoomScreen } from './src/screens/AfterRoomScreen';
import { PausedScreen } from './src/screens/PausedScreen';
import { HomeScreen, type DoorName } from './src/screens/home/HomeScreen';
import { LearnScreen } from './src/screens/home/LearnScreen';
import { MeScreen } from './src/screens/home/MeScreen';
import { PlayDoorScreen } from './src/screens/home/PlayDoorScreen';
import { SupportDoorScreen } from './src/screens/home/SupportDoorScreen';
import { StartScreen, type StartWhen } from './src/screens/StartScreen';
import { GroupScreen } from './src/screens/GroupScreen';
import { canGoIn, type Group } from './src/rooms/schedule';
import { clearReminders, onReminderTap } from './src/lib/reminders';
import { forgetPush, registerPush } from './src/lib/push';
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
import { forgetInvitationsSeen, hasNewInvitations, myInvitations } from './src/rooms/invitations';
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
      if (data.session) await forgetPush();
      if (data.session) await forgetVisits(data.session.user.id);
      if (data.session) await forgetInvitationsSeen(data.session.user.id);
      await clearReminders(data.session?.user.id ?? null);
    })
    .finally(() => void supabase.auth.signOut());
}

// Asks before doing something; Alert does nothing in a browser, so the web uses the browser's own box.
function askFirst(title: string, body: string, ok: string, onOk: () => void, cancel = 'Cancel') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}

${body}`)) onOk();
    return;
  }
  Alert.alert(title, body, [
    { text: cancel, style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

// A plain message with one button.
function tell(title: string, body: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${body}`);
    return;
  }
  Alert.alert(title, body);
}

function confirmDeleteAccount() {
  askFirst(
    'Delete your account?',
    'Your nickname, friends and everything tied to your account will be deleted. This can’t be undone.',
    'Delete',
    () =>
      void deleteMyAccount()
        .then(signOut)
        .catch(() => tell("We couldn't delete it", "Check that you're online, then try again.")),
    'Keep my account',
  );
}

// Always asks (docs/me-page-spec.md). You log back in with your nickname and password.
function confirmSignOut(nickname?: string) {
  askFirst(nickname ? `Log out of ${nickname}?` : 'Log out?', 'You can log back in with your nickname and password.', 'Log out', signOut);
}

type Screen =
  | { name: 'home' }
  | { name: 'door'; door: DoorName }
  | { name: 'me'; notice?: string }
  | { name: 'explore' }
  | { name: 'groups'; notice?: string; show?: 'friends' | 'groups' }
  | { name: 'group'; groupId: string; first?: Group; from: 'explore' | 'groups' }
  | { name: 'addEmail' }
  | { name: 'password' }
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
  | { name: 'after'; summary: RoomSummary; oneOnOneId?: string }
  | { name: 'hostApply'; from: 'support' | 'hosting' }
  | { name: 'hosting' }
  | { name: 'editProfile' }
  | { name: 'notifications' }
  | { name: 'blocked' }
  | { name: 'helpContact' }
  | { name: 'manageAccount' }
  | { name: 'activity' };

// Joining another room while minimised in one leaves it, so it asks first (Alert does nothing on web).
function confirmLeaveFor(then: () => void) {
  const title = 'Leave this room and join another?';
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(title)) then();
    return;
  }
  Alert.alert(title, undefined, [
    { text: 'Stay', style: 'cancel' },
    { text: 'Leave and join', onPress: then },
  ]);
}

// Signed in: date of birth first, then a nickname, then the house. Nobody reaches a room without both.
function SignedIn({
  session,
  recovering,
  pendingRequest,
  onPendingUsed,
}: {
  session: Session;
  // Signed in from a password reset email: ask for the new password first.
  recovering: boolean;
  // A room to open as soon as the person is ready (from a room link).
  pendingRequest: RoomRequest | null;
  onPendingUsed: () => void;
}) {
  const { state, reload } = useProfile(session.user.id);
  const [screen, setScreen] = useState<Screen>(recovering ? { name: 'password' } : { name: 'home' });
  // The room you're in. It stays connected while minimised: a small bar above the tabs, so you can
  // browse and still hear everyone. `roomShown` is false while minimised.
  const [active, setActive] = useState<{ request: RoomRequest; visit: number } | null>(null);
  const [roomShown, setRoomShown] = useState(false);
  const [canMinimise, setCanMinimise] = useState(false);
  const insets = useSafeAreaInsets();
  // Straight in: a link, a reminder, or a room moving you on ("Move me to another room").
  const goToRoom = useCallback((request: RoomRequest) => {
    setActive({ request, visit: Date.now() });
    setRoomShown(true);
  }, []);
  // From a page while minimised in a room: joining another leaves this one, so ask first.
  const activeNow = useRef(active);
  activeNow.current = active;
  const openRoom = useCallback(
    (request: RoomRequest) => {
      if (!activeNow.current) return goToRoom(request);
      confirmLeaveFor(() => goToRoom(request));
    },
    [goToRoom],
  );
  const [ban, setBan] = useState<Ban | null>(null);
  // A room link waits until we know whether the account is paused.
  const [banChecked, setBanChecked] = useState(false);
  // A reminder tapped on the lock screen: its room opens once the person is ready, like a link.
  const [reminderRequest, setReminderRequest] = useState<RoomRequest | null>(null);
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

  useEffect(
    () =>
      onReminderTap(
        (scheduledId, startsAt) => {
          // Before it opens (the reminder comes 15 minutes early): Groups, where Next up shows Go in when it's time.
          if (startsAt && !canGoIn(startsAt)) setScreen((now) => (now.name === 'after' ? now : { name: 'groups', show: 'groups' }));
          else setReminderRequest({ kind: 'scheduled', scheduledId });
        },
        () => setScreen((now) => (now.name === 'after' ? now : { name: 'groups', show: 'groups' })),
      ),
    [],
  );

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
  const busy = !!active || screen.name === 'after';
  useEffect(() => {
    if (!ready || busy || !pendingRequest) return;
    goToRoom(pendingRequest);
    onPendingUsed();
  }, [ready, busy, pendingRequest, onPendingUsed, goToRoom]);
  // Once ready: this phone's address for invitation alerts, if notifications are already allowed.
  useEffect(() => {
    if (!ready) return;
    void registerPush();
    // Allowed later in the phone's settings: picked up when Circles comes back.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void registerPush();
    });
    return () => sub.remove();
  }, [ready]);

  // The dot on the Groups tab: a new invitation since Groups was last opened. Checked every minute.
  const [groupsDot, setGroupsDot] = useState(false);
  const clearGroupsDot = useCallback(() => setGroupsDot(false), []);
  const onGroups = screen.name === 'groups';
  useEffect(() => {
    if (!ready || onGroups) return;
    const check = () =>
      void myInvitations()
        .then((list) => hasNewInvitations(session.user.id, list))
        .then(setGroupsDot)
        .catch(() => {});
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [ready, onGroups, session.user.id]);

  useEffect(() => {
    if (!ready || busy || !reminderRequest) return;
    goToRoom(reminderRequest);
    setReminderRequest(null);
  }, [ready, busy, reminderRequest, goToRoom]);

  // Android back button: back to Home from any page. In a room it minimises, so voice isn't lost by accident.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // In a room: minimise while connected; on its other screens (ended, no host…) do nothing, as before.
      if (roomShown && active) {
        if (canMinimise) setRoomShown(false);
        return true;
      }
      // Minimised on Home: stay in the app, so the room isn't cut off.
      if (screen.name === 'home') return !!active;
      // Back returns to where you came from.
      if (screen.name === 'start' && screen.from) setScreen({ name: screen.from } as Screen);
      else if (screen.name === 'group') setScreen({ name: screen.from } as Screen);
      else if (screen.name === 'start')
        setScreen(screen.door === 'learn' ? { name: 'learn', subject: screen.subject ?? '' } : { name: 'door', door: screen.door });
      else if (screen.name === 'learn') setScreen({ name: 'door', door: 'learn' });
      else if (['addEmail', 'password', 'hosting', 'editProfile', 'notifications', 'blocked', 'helpContact', 'manageAccount'].includes(screen.name)) setScreen({ name: 'me' });
      else if (screen.name === 'hostApply') setScreen(screen.from === 'support' ? { name: 'door', door: 'support' } : { name: 'hosting' });
      else setScreen({ name: 'home' });
      return true;
    });
    return () => sub.remove();
  }, [screen, roomShown, active, canMinimise]);

  if (state.status === 'loading') return <Centered />;
  if (state.status === 'error') {
    return (
      <Centered>
        <Text variant="body" color="textSoft" center>
          We couldn't load your account. Check that you're online.
        </Text>
        <Button label="Try again" onPress={() => void reload()} />
        <Button label="Log out" variant="quiet" onPress={() => confirmSignOut()} />
      </Centered>
    );
  }

  const { nickname, dateOfBirth } = state.profile;
  if (!dateOfBirth) return <AgeScreen onSaved={() => void reload()} onBack={signOut} />;
  // Stay signed in, so the same phone can't just try another date. Close leaves the app.
  if (!isAdult(new Date(dateOfBirth))) return <UnderAgeScreen onClose={() => BackHandler.exitApp()} />;
  if (!nickname) return <NicknameScreen onSaved={() => void reload()} onBack={signOut} />;
  if (ban) return <PausedScreen ban={ban} onLogOut={() => confirmSignOut()} onDelete={confirmDeleteAccount} />;

  const me = { id: session.user.id, nickname };
  const home = () => setScreen({ name: 'home' });
  const enter = openRoom;

  // The bottom bar (docs/design/pages/tabs.md): on the four main pages and the pages opened from
  // them; hidden in rooms, after a room, Start something and adding an email.
  const tab: Tab | null =
    screen.name === 'home' || screen.name === 'door' || screen.name === 'learn' || screen.name === 'activity'
      ? 'home'
      : screen.name === 'explore' || screen.name === 'groups' || screen.name === 'me'
        ? screen.name
        : screen.name === 'group'
          ? screen.from
          : ['hosting', 'notifications', 'blocked', 'helpContact', 'manageAccount'].includes(screen.name)
            ? 'me'
            : null;
  const roomOpen = !!active && roomShown;
  // Same three places every time (page, room, tabs), so the room is never rebuilt, and its voice never
  // dropped, when it's minimised or opened again.
  return (
    <TabsProvider value={tabs}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {roomOpen ? null : <View style={{ flex: 1 }}>{renderPage()}</View>}
        {active ? (
          // Minimised with no tab bar under it (Start, after a room…): clear of the phone's gesture bar.
          <View style={roomOpen ? { flex: 1 } : { paddingBottom: tab ? 0 : insets.bottom }}>
            <RoomScreen
              key={active.visit}
              me={me}
              request={active.request}
              minimised={!roomOpen}
              onMinimise={() => setRoomShown(false)}
              onExpand={() => setRoomShown(true)}
              onCanMinimise={setCanMinimise}
              onLeft={(summary) => {
                const request = active.request;
                setActive(null);
                setRoomShown(false);
                // For Home's "Go back in" and "For you", kept on this phone (never support rooms).
                if (summary) void rememberVisit(me.id, summary.room);
                if (summary) setScreen({ name: 'after', summary, oneOnOneId: request.kind === 'join' ? request.oneOnOneId : undefined });
                // A room that never started: back to the form, with what they typed still there.
                else if (request.kind === 'create') setScreen({ name: 'start', door: request.door, draft: request });
                else home();
                void myBan()
                  .then(setBan)
                  .catch(() => {});
              }}
              onMove={goToRoom}
            />
          </View>
        ) : null}
        {tab && !roomOpen ? (
          <TabBar
            current={tab}
            me={me}
            groupsDot={groupsDot}
            onSelect={(t) => setScreen({ name: t } as Screen)}
            onReselect={(t) => {
              // Tapping Home again from a door page goes back to Home itself.
              if (t === 'home' && screen.name !== 'home') home();
              else scrollers.current.get(t)?.();
            }}
          />
        ) : null}
      </View>
    </TabsProvider>
  );

  function renderPage() {
    switch (screen.name) {
      case 'after':
        return <AfterRoomScreen me={me} summary={screen.summary} oneOnOneId={screen.oneOnOneId} onDone={home} />;
      case 'hostApply':
        return (
          <HostApplyScreen
            onClose={() => setScreen(screen.from === 'support' ? { name: 'door', door: 'support' } : { name: 'hosting' })}
          />
        );
      case 'editProfile':
        return (
          <EditProfileScreen
            me={me}
            onBack={() => setScreen({ name: 'me' })}
            onSaved={() => {
              void reload();
              setScreen({ name: 'me', notice: 'Saved.' });
            }}
          />
        );
      case 'notifications':
        return <NotificationsScreen me={me} onBack={() => setScreen({ name: 'me' })} />;
      case 'blocked':
        return <BlockedScreen me={me} onBack={() => setScreen({ name: 'me' })} />;
      case 'helpContact':
        return <HelpContactScreen onBack={() => setScreen({ name: 'me' })} />;
      case 'hosting':
        return (
          <HostToolsScreen
            onBack={() => setScreen({ name: 'me' })}
            onEnter={enter}
            onApply={() => setScreen({ name: 'hostApply', from: 'hosting' })}
          />
        );
      case 'me':
        return (
          <MeScreen
            me={me}
            email={realEmail(session.user.email)}
            notice={screen.notice}
            onEdit={() => setScreen({ name: 'editProfile' })}
            onNotifications={() => setScreen({ name: 'notifications' })}
            onBlocked={() => setScreen({ name: 'blocked' })}
            onHelpContact={() => setScreen({ name: 'helpContact' })}
            onHosting={() => setScreen({ name: 'hosting' })}
            onAddEmail={() => setScreen({ name: 'addEmail' })}
            onPassword={() => setScreen({ name: 'password' })}
            onLogOut={() => confirmSignOut(me.nickname)}
            onManage={() => setScreen({ name: 'manageAccount' })}
          />
        );
      case 'activity':
        return (
          <ActivityScreen
            me={me}
            onBack={home}
            onPeople={() => setScreen({ name: 'groups', show: 'groups' })}
            onFriends={() => setScreen({ name: 'groups', show: 'friends' })}
            onHosting={() => setScreen({ name: 'hosting' })}
          />
        );
      case 'manageAccount':
        return <ManageAccountScreen onBack={() => setScreen({ name: 'me' })} onDelete={confirmDeleteAccount} />;
      case 'addEmail':
        return (
          <AddEmailFlow
            onClose={() => setScreen({ name: 'me' })}
            onAdded={() => setScreen({ name: 'me', notice: 'Email added. Your account is safe.' })}
          />
        );
      case 'password':
        return (
          <PasswordScreen
            title={recovering ? 'Make a new password' : 'Your password'}
            onClose={() => setScreen({ name: 'me' })}
            onSaved={() => setScreen({ name: 'me', notice: 'Password saved.' })}
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
            onScheduled={(notice) => setScreen({ name: 'groups', notice, show: 'groups' })}
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
        if (screen.door === 'support') {
          return <SupportDoorScreen onBack={home} onEnter={enter} onBecomeHost={() => setScreen({ name: 'hostApply', from: 'support' })} />;
        }
        if (screen.door === 'play') {
          return <PlayDoorScreen onBack={home} onEnter={enter} onStart={() => setScreen({ name: 'start', door: 'play' })} />;
        }
        return <LearnScreen onBack={home} onEnter={enter} onOpenSubject={(subject) => setScreen({ name: 'learn', subject })} />;
      case 'group':
        return (
          <GroupScreen
            me={me}
            groupId={screen.groupId}
            first={screen.first}
            backLabel={screen.from === 'explore' ? 'Back to Rooms' : 'Back to People'}
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
            key={`${screen.notice ?? ''}${screen.show ?? ''}`}
            me={me}
            nickname={me.nickname}
            notice={screen.notice}
            show={screen.show}
            onStartGroup={() => setScreen({ name: 'start', door: 'talk', from: 'groups', when: 'weekly' })}
            onOpenGroup={(groupId, first) => setScreen({ name: 'group', groupId, first, from: 'groups' })}
            onSeenInvitations={clearGroupsDot}
            onEnter={enter}
            onExplore={() => setScreen({ name: 'explore' })}
          />
        );
      default:
        return (
          <>
            <HomeScreen
              me={me}
              // Friends is a side of the People tab, not a page of its own.
              onOpen={(door) => setScreen(door === 'people' ? { name: 'groups', show: 'friends' } : { name: 'door', door })}
              onEnter={enter}
              onExplore={() => setScreen({ name: 'explore' })}
              onActivity={() => setScreen({ name: 'activity' })}
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
  const [recovering, setRecovering] = useState(false);
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
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
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
        recovering={recovering}
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
