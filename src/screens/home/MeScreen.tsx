import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, ChevronRight, FileText, LifeBuoy, LogOut, Mail, ScrollText, Shield, Users } from 'lucide-react-native';
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
import { myConnections } from '../../lib/people';
import { listBlocked, unblockPerson, type Blocked } from '../../lib/safety';
import { useSoundSetting } from '../../lib/sounds';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import { border, opacity, size, space, useColors } from '../../theme';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

type Props = {
  me: { id: string; nickname: string };
  // The email on this account, or null. Only ever shown to its owner, here.
  email: string | null;
  onAddEmail: () => void;
  onOpenPeople: () => void;
  onLogOut: () => void;
  onDelete: () => void;
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

function Row({
  Icon,
  title,
  line,
  onPress,
  trailing,
}: {
  Icon: Icon;
  title: string;
  line?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={line ? `${title}. ${line}` : title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.minTarget + space[1],
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{title}</Text>
        {line ? (
          <Text variant="meta" color="textSoft">
            {line}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} /> : null)}
    </Pressable>
  );
}

// Me: you and your settings (docs/design/pages/tabs.md › Me). Only your nickname is ever shown to others.
export function MeScreen({ me, email, onAddEmail, onOpenPeople, onLogOut, onDelete, notice }: Props) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('me');
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(notice ?? null);
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundOn, setSoundOn] = useSoundSetting();
  const [friends, setFriends] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setBlocked(await listBlocked());
      setFailed(false);
    } catch {
      setFailed(true);
    }
    try {
      setFriends((await myConnections()).length);
    } catch {
      setFriends(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(person: Blocked) {
    try {
      await unblockPerson(me.id, person.id);
      setBlocked((list) => (list ?? []).filter((b) => b.id !== person.id));
      setToast(`${person.nickname} is unblocked.`);
    } catch {
      setToast("That didn't work. Check your connection.");
    }
  }

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[4], paddingBottom: space[7], gap: space[6] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <Avatar userId={me.id} nickname={me.nickname} diameter={size.avatarRoom} />
          <View style={{ flex: 1, gap: space[1] }}>
            <Text variant="title" accessibilityRole="header" numberOfLines={1}>
              {me.nickname}
            </Text>
            <Text variant="meta" color="textSoft">
              Your nickname is the only thing people see about you.
            </Text>
          </View>
        </View>

        <Group title="Your people">
          <Row
            Icon={Users}
            title={friends === null ? 'Saved each other' : `Saved each other: ${friends}`}
            line="Only the two of you ever see it"
            onPress={onOpenPeople}
          />
        </Group>

        <Group title="Account">
          {EMAIL_ENABLED ? (
            email ? (
              <Row
                Icon={Mail}
                title="Your email"
                line={email}
                trailing={<Button label="Change" onPress={onAddEmail} style={{ width: size.rowAction }} />}
              />
            ) : (
              <Row Icon={Mail} title="Add your email" line="Keeps your account if you change phones" onPress={onAddEmail} />
            )
          ) : null}
          <Row Icon={LogOut} title="Log out" onPress={onLogOut} />
        </Group>

        <Group title="Sound">
          <SwitchRow title="Game sounds" line="Quiet sounds for dice, moves and your turn" value={soundOn} onChange={setSoundOn} />
        </Group>

        <Group title="Privacy">
          <Row Icon={Shield} title="Support rooms are never shown to anyone" />
          <Text variant="metaStrong" color="textSoft" style={{ marginTop: space[2] }}>
            Blocked people
          </Text>
          {failed ? (
            <View style={{ gap: space[2] }}>
              <Text variant="body" color="textSoft">
                {"We couldn't load this. Check that you're online."}
              </Text>
              <Button label="Try again" variant="quiet" onPress={() => void load()} />
            </View>
          ) : blocked === null ? null : blocked.length === 0 ? (
            <Text variant="body" color="textSoft">
              {"You haven't blocked anyone."}
            </Text>
          ) : (
            blocked.map((person, i) => (
              <View
                key={person.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[3],
                  paddingVertical: space[3],
                  borderTopWidth: i === 0 ? 0 : border.hairline,
                  borderTopColor: colors.divider,
                }}
              >
                <Avatar userId={person.id} nickname={person.nickname} diameter={size.avatarList} />
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {person.nickname}
                </Text>
                <Button label="Unblock" onPress={() => void unblock(person)} style={{ width: size.rowAction }} />
              </View>
            ))
          )}
        </Group>

        <Group title="Help and safety">
          <Row Icon={LifeBuoy} title="Help" line="If you or someone else needs help now" onPress={() => setHelpOpen(true)} />
          <Row Icon={BookOpen} title="Room rules" onPress={() => setRulesOpen(true)} />
          <Row Icon={FileText} title="Privacy Policy" onPress={() => setDoc(PRIVACY)} />
          <Row Icon={ScrollText} title="Terms" onPress={() => setDoc(TERMS)} />
        </Group>

        <Text variant="meta" color="textMeta">
          {appVersionLine()}
        </Text>

        <Pressable accessibilityRole="button" onPress={onDelete} style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
          <Text variant="bodyStrong" color="danger">
            Delete my account
          </Text>
        </Pressable>
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
