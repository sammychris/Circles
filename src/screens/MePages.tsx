import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { AvatarPicker } from '../components/AvatarPicker';
import { Button } from '../components/Button';
import { SwitchRow } from '../components/Choice';
import { DoorLayout } from '../components/DoorLayout';
import { FilterChip } from '../components/FilterChip';
import { ShowSome } from '../components/ShowSome';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { Toast } from '../components/Toast';
import { lookKnown, rememberLook, useLook, type Look } from '../lib/avatars';
import { ProfileError, myAlertPrefs, sendFeedback, setAlertPrefs, updateMyProfile, type AlertPrefs } from '../lib/profile';
import { alertsAllowed, turnOnAlerts } from '../lib/push';
import { clearReminders, remindersOn, setRemindersOn } from '../lib/reminders';
import { listBlocked, unblockPerson, type Blocked } from '../lib/safety';
import { myHostStatus } from '../support/api';
import { initialOf, tintIndex } from '../lib/seats';
import { NICKNAME_MAX, NICKNAME_PROBLEM_TEXT, nicknameProblem } from '../lib/validation';
import { avatarTints, size, space } from '../theme';

// The pages behind Me (docs/me-page-spec.md): Edit, Notifications, Blocked people, Help & contact.

type Me = { id: string; nickname: string };

export function EditProfileScreen({ me, onBack, onSaved }: { me: Me; onBack: () => void; onSaved: (nickname: string) => void }) {
  const saved = useLook(me.id);
  const [nickname, setNickname] = useState(me.nickname);
  const [look, setLook] = useState<Look>({ tint: saved?.tint ?? tintIndex(me.id, avatarTints.length), symbol: saved?.symbol ?? null });
  // Until they touch the picker, follow the saved look as it arrives, so Save never wipes it.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched && saved) setLook({ tint: saved.tint ?? tintIndex(me.id, avatarTints.length), symbol: saved.symbol });
  }, [saved, touched, me.id]);
  const ready = touched || lookKnown(me.id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const clean = nickname.trim();
    if (clean !== me.nickname) {
      const problem = nicknameProblem(clean);
      if (problem) return setError(NICKNAME_PROBLEM_TEXT[problem]);
    }
    setBusy(true);
    setError(null);
    try {
      await updateMyProfile(clean, look.tint, look.symbol);
      rememberLook(me.id, look);
      onSaved(clean);
    } catch (e) {
      const code = e instanceof ProfileError ? e.code : 'other';
      setError(
        code === 'nickname_taken'
          ? 'Someone already has that nickname. Try another.'
          : code === 'too_soon'
            ? `You can change your nickname once a week. To save your new look, put your nickname back to ${me.nickname}.`
            : code === 'reserved'
              ? NICKNAME_PROBLEM_TEXT.reserved
              : code === 'invalid_nickname'
                ? NICKNAME_PROBLEM_TEXT.badCharacters
                : "That didn't save. Check that you're online.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DoorLayout
      title="Edit"
      line="Only your nickname and look are ever shown to others."
      onBack={onBack}
      backLabel="Back to Me"
      footer={<Button label="Save" variant="primary" loading={busy} disabled={!ready} onPress={() => void save()} />}
    >
      <View style={{ alignItems: 'center' }}>
        <Avatar userId={me.id} nickname={nickname || me.nickname} look={look} />
      </View>
      <TextField
        label="Nickname"
        value={nickname}
        onChangeText={(t) => {
          setNickname(t);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={NICKNAME_MAX}
        helper="Don't use your real name if you'd rather stay private. You'll log in with this nickname. Once a week at most."
        error={error}
      />
      <AvatarPicker
        value={look}
        initial={initialOf(nickname || me.nickname)}
        onChange={(l) => {
          setTouched(true);
          setLook(l);
        }}
      />
    </DoorLayout>
  );
}

export function NotificationsScreen({ me, onBack }: { me: Me; onBack: () => void }) {
  const [isHost, setIsHost] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prefs, setPrefs] = useState<AlertPrefs | null>(null);
  const [reminders, setReminders] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void myAlertPrefs()
      .then(setPrefs)
      .catch(() => setFailed(true));
    void remindersOn(me.id).then(setReminders);
    void alertsAllowed().then(setAllowed);
    void myHostStatus()
      .then((s) => setIsHost(s.isHost))
      .catch(() => {});
  }, [me.id]);

  const change = (next: AlertPrefs) => {
    const before = prefs;
    setPrefs(next);
    void setAlertPrefs(next).catch(() => {
      setPrefs(before);
      setToast("That didn't save. Check that you're online.");
    });
  };

  return (
    <DoorLayout
      title="Notifications"
      onBack={onBack}
      backLabel="Back to Me"
      footer={toast ? <Toast message={toast} onDone={() => setToast(null)} /> : undefined}
    >
      {!allowed ? (
        <View style={{ gap: space[2] }}>
          <Text variant="body" color="textSoft">
            Notifications are off for Circles on this phone.
          </Text>
          <Button
            label="Turn them on"
            onPress={() =>
              void turnOnAlerts().then((on) => {
                setAllowed(on);
                if (!on) setToast("Your phone said no. You can allow them for Circles in your phone's settings.");
              })
            }
          />
        </View>
      ) : null}
      {failed && !prefs ? (
        <View style={{ gap: space[2] }}>
          <Text variant="body" color="textSoft">
            {"Couldn't load your settings. Check that you're online."}
          </Text>
          <Button
            label="Try again"
            variant="quiet"
            onPress={() => {
              setFailed(false);
              void myAlertPrefs()
                .then(setPrefs)
                .catch(() => setFailed(true));
            }}
          />
        </View>
      ) : !prefs ? (
        <Text variant="meta" color="textMeta">
          Loading…
        </Text>
      ) : null}
      {prefs ? (
        <View style={{ gap: space[2] }}>
          <SwitchRow title="Invitations from friends" value={prefs.invitations} onChange={(v) => change({ ...prefs, invitations: v })} />
          <SwitchRow
            title="Room reminders"
            line="15 minutes before rooms you said Remind me to"
            value={reminders}
            onChange={(v) => {
              setReminders(v);
              void setRemindersOn(me.id, v).then(() => (v ? undefined : clearReminders(me.id)));
            }}
          />
          {isHost ? (
            <SwitchRow title="One-on-one requests" line="When someone asks you for a session" value={prefs.hostRequests} onChange={(v) => change({ ...prefs, hostRequests: v })} />
          ) : null}
        </View>
      ) : null}
      <Text variant="meta" color="textMeta">
        Alerts never say what kind of room you're in.
      </Text>
    </DoorLayout>
  );
}

export function BlockedScreen({ me, onBack }: { me: Me; onBack: () => void }) {
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const load = () =>
    void listBlocked()
      .then((b) => {
        setBlocked(b);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  useEffect(load, []);

  const unblock = async (person: Blocked) => {
    try {
      await unblockPerson(me.id, person.id);
      setBlocked((list) => (list ?? []).filter((b) => b.id !== person.id));
      setToast(`${person.nickname} is unblocked.`);
    } catch {
      setToast("That didn't work. Check your connection.");
    }
  };

  return (
    <DoorLayout
      title="Blocked people"
      line="You're never put in a room with them, and they can't invite you."
      onBack={onBack}
      backLabel="Back to Me"
      footer={toast ? <Toast message={toast} onDone={() => setToast(null)} /> : undefined}
    >
      {failed ? (
        <View style={{ gap: space[2] }}>
          <Text variant="body" color="textSoft">
            {"We couldn't load this. Check that you're online."}
          </Text>
          <Button label="Try again" variant="quiet" onPress={load} />
        </View>
      ) : blocked === null ? (
        <Text variant="meta" color="textMeta">
          Loading…
        </Text>
      ) : blocked.length === 0 ? (
        <Text variant="body" color="textSoft">
          {"You haven't blocked anyone."}
        </Text>
      ) : (
        <View>
          <ShowSome
            items={blocked}
            noun="blocked people"
            render={(person) => (
              <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.minTarget + space[3] }}>
                <Avatar userId={person.id} nickname={person.nickname} diameter={size.avatarList} />
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {person.nickname}
                </Text>
                <Button label="Unblock" accessibilityHint={`Unblocks ${person.nickname}`} onPress={() => void unblock(person)} style={{ width: size.rowAction }} />
              </View>
            )}
          />
        </View>
      )}
    </DoorLayout>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: 'Who can see me?', a: 'Only your nickname and look. Never your number, email or real name, and never that you were in a support room.' },
  { q: 'Why is my mic off when I join?', a: 'Every room starts with your mic off. Rooms go live once enough people are in (3 in support rooms); then tap the mic to talk.' },
  { q: 'How do friends work?', a: 'After a room, save people you clicked with. If they save you back, you are friends. Only the two of you ever see it.' },
  { q: 'Someone was unkind. What do I do?', a: 'Tap their seat, then Block or Report. You can also leave the room at any time. The team reads every report.' },
  { q: 'I forgot my password.', a: 'If you added an email, tap Forgot your password on the log in page. Add an email in Me so this works for you; without one, the team can’t check it’s your account.' },
];

export function HelpContactScreen({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<'problem' | 'question' | 'idea'>('problem');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    try {
      const r = await sendFeedback(kind, text.trim());
      if (r === 'too_many') setToast("You've sent a few today. Try again tomorrow.");
      else {
        setText('');
        setToast('Sent. Thank you. The team reads every message.');
      }
    } catch {
      setToast("That didn't send. Check that you're online.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DoorLayout
      title="Help & contact"
      line="Questions about the app. If you or someone else is in danger, use Get help now."
      onBack={onBack}
      backLabel="Back to Me"
      footer={toast ? <Toast message={toast} onDone={() => setToast(null)} /> : undefined}
    >
      <View style={{ gap: space[4] }}>
        {FAQ.map((f) => (
          <View key={f.q} style={{ gap: space[1] }}>
            <Text variant="bodyStrong">{f.q}</Text>
            <Text variant="body" color="textSoft">
              {f.a}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ gap: space[3] }}>
        <Text variant="heading" accessibilityRole="header">
          Write to the team
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="What is it?" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          <FilterChip label="A problem" selected={kind === 'problem'} onPress={() => setKind('problem')} />
          <FilterChip label="A question" selected={kind === 'question'} onPress={() => setKind('question')} />
          <FilterChip label="An idea" selected={kind === 'idea'} onPress={() => setKind('idea')} />
        </View>
        <TextField label="Your message" value={text} onChangeText={setText} maxLength={1000} multiline helper="Don't include phone numbers or passwords." />
        <Button label="Send" disabled={text.trim().length < 5} loading={busy} onPress={() => void send()} />
      </View>
    </DoorLayout>
  );
}

// Manage account: Delete my account lives here, one step in from Me, at the bottom as small red text
// (docs/me-page-spec.md). Apple and Google require it to be in the app.
export function ManageAccountScreen({ onBack, onDelete }: { onBack: () => void; onDelete: () => void }) {
  return (
    <DoorLayout title="Manage account" onBack={onBack} backLabel="Back to Me">
      <Text variant="body" color="textSoft">
        Your account is your nickname, your look, your friends and your settings. Nothing else about you is kept.
      </Text>
      <Pressable accessibilityRole="button" onPress={onDelete} style={{ minHeight: size.minTarget, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Text variant="meta" color="danger">
          Delete my account
        </Text>
      </Pressable>
    </DoorLayout>
  );
}
