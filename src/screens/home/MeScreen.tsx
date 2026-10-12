import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ban,
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  HeartHandshake,
  KeyRound,
  LifeBuoy,
  Mail,
  MessageCircleQuestion,
  ScrollText,
  Settings,
  Shield,
  Smartphone,
} from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { SwitchRow } from '../../components/Choice';
import { HelpModal } from '../../components/HelpModal';
import { LegalModal } from '../../components/LegalModal';
import { RoomRulesSheet } from '../../components/RoomRulesSheet';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { EMAIL_ENABLED } from '../../config';
import { PRIVACY, TERMS, type LegalDoc } from '../../content/legal';
import { appVersionLine } from '../../lib/appVersion';
import { listBlocked } from '../../lib/safety';
import { useSoundSetting } from '../../lib/sounds';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import { myHostStatus, type HostStatus } from '../../support/api';
import { opacity, radius, size, space, useColors } from '../../theme';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

type Props = {
  me: { id: string; nickname: string };
  // The email on this account, or null. Only ever shown to its owner, here.
  email: string | null;
  onEdit: () => void;
  onAddEmail: () => void;
  onPassword: () => void;
  onNotifications: () => void;
  onBlocked: () => void;
  onHelpContact: () => void;
  // Becoming a host, or a host's tools.
  onHosting: () => void;
  onLogOut: () => void;
  // Manage account, where Delete my account lives (one step in, docs/me-page-spec.md).
  onManage: () => void;
  // A note to show once on arrival, e.g. "Email added. Your account is safe."
  notice?: string;
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[1] }}>
      <Text variant="metaStrong" color="textMeta" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

// One line per row: icon, label, then a value and an arrow when it opens a page. No arrow on actions.
function Row({ Icon, title, value, onPress, dim }: { Icon: Icon; title: string; value?: string; onPress?: () => void; dim?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityState={dim ? { disabled: true } : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.buttonPrimary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        opacity: dim ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {value ? (
        <Text variant="meta" color="textSoft" numberOfLines={1} style={{ maxWidth: '50%' }}>
          {value}
        </Text>
      ) : null}
      {onPress ? <ChevronRight size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} /> : null}
    </Pressable>
  );
}

// Me: who you are to others, and your settings, in one compact list (docs/me-page-spec.md).
export function MeScreen({ me, email, onEdit, onAddEmail, onPassword, onNotifications, onBlocked, onHelpContact, onHosting, onLogOut, onManage, notice }: Props) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('me');
  const [toast, setToast] = useState<string | null>(notice ?? null);
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundOn, setSoundOn] = useSoundSetting();
  const [blocked, setBlocked] = useState<number | null>(null);
  const [host, setHost] = useState<HostStatus | null>(null);
  // The update time is for testers; a tap on the version shows it.
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    void listBlocked()
      .then((b) => setBlocked(b.length))
      .catch(() => setBlocked(null));
    void myHostStatus()
      .then(setHost)
      .catch(() => {});
  }, []);

  const hosting = host?.isHost
    ? { title: 'Host tools', line: 'Rooms, one-on-one and your card' }
    : host?.application?.status === 'pending'
      ? { title: 'Host application', line: 'Waiting for review' }
      : host?.application?.status === 'needs_changes'
        ? { title: 'Host application', line: 'Needs changes' }
        : { title: 'Want to help others?', line: 'Become a host' };

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[4], paddingBottom: space[7], gap: space[6] }}
      >
        <Text variant="title" accessibilityRole="header">
          Me
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <Avatar userId={me.id} nickname={me.nickname} diameter={size.avatarRoom} />
          <View style={{ flex: 1, gap: space[1] }}>
            <Text variant="heading" numberOfLines={1}>
              {me.nickname}
            </Text>
            <Text variant="meta" color="textSoft">
              Only your nickname and look are visible to others.
            </Text>
          </View>
          <Button label="Edit" onPress={onEdit} style={{ width: size.rowAction }} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${hosting.title}. ${hosting.line}`}
          onPress={onHosting}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            padding: space[4],
            borderRadius: radius.card,
            backgroundColor: colors.surface,
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <HeartHandshake size={size.icon} color={colors.emberText} strokeWidth={size.iconStroke} />
          <View style={{ flex: 1, gap: space[1] }}>
            <Text variant="bodyStrong">{hosting.title}</Text>
            <Text variant="meta" color="textSoft">
              {hosting.line}
            </Text>
          </View>
          <ChevronRight size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
        </Pressable>

        <Group title="Account">
          {/* Ready for phone checks: the number will never be shown to anyone. */}
          <Row Icon={Smartphone} title="Phone number" value="Coming soon" dim />
          {EMAIL_ENABLED ? <Row Icon={Mail} title="Email" value={email ?? 'Add'} onPress={onAddEmail} /> : null}
          <Row Icon={KeyRound} title="Password" onPress={onPassword} />
          <Row Icon={Settings} title="Manage account" onPress={onManage} />
        </Group>

        <Group title="Preferences">
          <Row Icon={Bell} title="Notifications" onPress={onNotifications} />
          <SwitchRow title="Game sounds" value={soundOn} onChange={setSoundOn} />
        </Group>

        <Group title="Privacy and safety">
          <Row Icon={Ban} title="Blocked people" value={blocked === null ? undefined : String(blocked)} onPress={onBlocked} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[2] }}>
            <Shield size={size.iconMeta} color={colors.textMeta} strokeWidth={size.iconStroke} />
            <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
              Support rooms are never shown to anyone, including friends.
            </Text>
          </View>
        </Group>

        <Group title="Help">
          <Row Icon={LifeBuoy} title="Get help now" onPress={() => setHelpOpen(true)} />
          <Row Icon={MessageCircleQuestion} title="Help & contact" onPress={onHelpContact} />
          <Row Icon={BookOpen} title="Room rules" onPress={() => setRulesOpen(true)} />
        </Group>

        <Group title="About">
          <Row Icon={FileText} title="Privacy policy" onPress={() => setDoc(PRIVACY)} />
          <Row Icon={ScrollText} title="Terms" onPress={() => setDoc(TERMS)} />
        </Group>

        <View style={{ gap: space[2] }}>
          {/* An action, not a page: no arrow. It asks first. */}
          <Pressable accessibilityRole="button" onPress={onLogOut} style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
            <Text variant="bodyStrong">Log out</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setShowUpdate(!showUpdate)} style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
            <Text variant="meta" color="textMeta">
              {showUpdate ? appVersionLine() : appVersionLine().split(',')[0]}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: space[4] }} pointerEvents="none">
        <Toast message={toast} onDone={() => setToast(null)} />
      </View>
      <LegalModal doc={doc} onClose={() => setDoc(null)} />
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} inRoom={false} />
      <RoomRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </SafeAreaView>
  );
}
