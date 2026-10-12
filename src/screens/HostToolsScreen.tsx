import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { RadioRow, SwitchRow } from '../components/Choice';
import { DoorLayout } from '../components/DoorLayout';
import { FilterChip } from '../components/FilterChip';
import { ShowSome } from '../components/ShowSome';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { Toast } from '../components/Toast';
import type { RoomRequest } from '../rooms/api';
import {
  BADGE,
  LANGUAGES,
  TOPICS,
  hostRequests,
  myHostStatus,
  respondToRequest,
  setOnline,
  updateHostProfile,
  type HostRequest,
  type HostStatus,
} from '../support/api';
import { radius, space, useColors } from '../theme';

const MINUTES = [20, 30, 45, 60];
// Trained listeners unlock one-on-one after this many support rooms (CIRCLES_INTENT.md › Support).
const UNLOCK_AFTER = 5;
// The same limit as the database (host_profiles.price_naira).
const MAX_PRICE = 200000;

// Me › Hosting: where an application is, and for hosts: start a support room, go online for one-on-one,
// answer requests, and edit the card people see.
export function HostToolsScreen({ onBack, onEnter, onApply }: { onBack: () => void; onEnter: (r: RoomRequest) => void; onApply: () => void }) {
  const colors = useColors();
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [requests, setRequests] = useState<HostRequest[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<{ intro: string; topics: string[]; languages: string[]; offers: boolean; minutes: number; price: string; freeFirst: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await myHostStatus();
      setStatus(s);
      setFailed(false);
      if (s.profile) {
        setForm((f) =>
          f ?? {
            intro: s.profile!.intro,
            topics: s.profile!.topics,
            languages: s.profile!.languages,
            offers: s.profile!.offers,
            minutes: s.profile!.minutes,
            price: String(s.profile!.price || ''),
            freeFirst: s.profile!.freeFirst,
          },
        );
      }
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  // Requests: checked every 10 seconds while this page is open.
  const isHost = !!status?.isHost;
  useEffect(() => {
    if (!isHost) return;
    const check = () => void hostRequests().then(setRequests).catch(() => {});
    check();
    const timer = setInterval(check, 10_000);
    return () => clearInterval(timer);
  }, [isHost]);

  const answer = async (r: HostRequest, yes: boolean) => {
    try {
      const roomId = await respondToRequest(r.id, yes);
      setRequests((list) => list.filter((x) => x.id !== r.id));
      if (roomId) onEnter({ kind: 'join', roomId });
    } catch {
      setToast('That request has run out or was cancelled.');
      setRequests((list) => list.filter((x) => x.id !== r.id));
    }
  };

  const save = async () => {
    if (!form || !status?.profile) return;
    const pro = status.profile.kind === 'professional';
    const price = pro ? Math.max(0, Math.round(Number(form.price.replace(/[^\d]/g, '')) || 0)) : 0;
    if (price > MAX_PRICE) {
      setToast(`The most a session can cost is ₦${MAX_PRICE.toLocaleString('en-NG')}.`);
      return;
    }
    setSaving(true);
    try {
      await updateHostProfile({ ...form, price, freeFirst: pro && form.freeFirst });
      setToast('Saved.');
      void load();
    } catch {
      setToast("That didn't save. Check that you're online.");
    } finally {
      setSaving(false);
    }
  };

  const app = status?.application;
  const footer = toast ? <Toast message={toast} onDone={() => setToast(null)} /> : undefined;

  if (!status) {
    return (
      <DoorLayout title="Hosting" onBack={onBack} backLabel="Back to Me">
        {failed ? (
          <View style={{ gap: space[2] }}>
            <Text variant="body" color="textSoft">
              {"Couldn't load. Check that you're online."}
            </Text>
            <Button label="Try again" variant="quiet" onPress={() => void load()} />
          </View>
        ) : null}
      </DoorLayout>
    );
  }

  if (!status.isHost) {
    const words =
      app?.status === 'pending'
        ? { title: 'Waiting for review', line: "The Circles team reviews applications within 48 hours. We'll update this page." }
        : app?.status === 'needs_changes'
          ? { title: 'Needs changes', line: app.note ?? 'The team asked for a few changes. Apply again with them.' }
          : app?.status === 'rejected'
            ? { title: 'Not approved this time', line: app.note ?? 'Thank you for offering to help.' }
            : { title: 'Not a host yet', line: 'Hosts run free support rooms, and after a while can offer one-on-one.' };
    return (
      <DoorLayout
        title="Hosting"
        onBack={onBack}
        backLabel="Back to Me"
        footer={app?.status === 'pending' ? footer : <Button label={app ? 'Apply again' : 'Become a host'} variant="primary" onPress={onApply} />}
      >
        <View style={{ gap: space[2] }}>
          <Text variant="heading">{words.title}</Text>
          <Text variant="body" color="textSoft">
            {words.line}
          </Text>
        </View>
      </DoorLayout>
    );
  }

  const profile = status.profile;
  const pro = profile?.kind === 'professional';
  const toUnlock = Math.max(0, UNLOCK_AFTER - status.hosted);

  return (
    <DoorLayout title="Hosting" line={profile ? BADGE[profile.kind] : undefined} onBack={onBack} backLabel="Back to Me" footer={footer}>
      <View style={{ gap: space[2] }}>
        <Button label="Start a support room" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'support', mood: null })} />
        <Text variant="meta" color="textMeta" center>
          {`It starts once 2 others join. You've hosted ${status.hosted} ${status.hosted === 1 ? 'room' : 'rooms'}.`}
        </Text>
      </View>

      <View style={{ gap: space[3] }}>
        <Text variant="heading" accessibilityRole="header">
          One-on-one
        </Text>
        {!status.trusted ? (
          <Text variant="body" color="textSoft">
            {pro
              ? 'One-on-one opens once your licence is checked.'
              : `Opens after ${UNLOCK_AFTER} support rooms. ${toUnlock} to go.`}
          </Text>
        ) : (
          <>
            <SwitchRow
              title="Online for one-on-one"
              line="You're listed for the next 4 hours, or until you switch it off."
              value={!!profile?.online}
              onChange={(on) =>
                void setOnline(on)
                  .then(load)
                  .catch(() => setToast("That didn't work. Check that you're online."))
              }
            />
            {!form?.offers ? (
              <Text variant="meta" color="textMeta">
                Turn on "Offer one-on-one" below to be listed.
              </Text>
            ) : null}
            <Text variant="bodyStrong">Requests</Text>
            {requests.length === 0 ? (
              <Text variant="body" color="textSoft">
                No requests right now. They run out after 10 minutes.
              </Text>
            ) : (
              <View>
                <ShowSome
                  items={requests}
                  noun="requests"
                  render={(r) => (
                    <View key={r.id} style={{ gap: space[2], paddingVertical: space[3], backgroundColor: colors.surface, borderRadius: radius.card, padding: space[3], marginBottom: space[2] }}>
                      <Text variant="bodyStrong">{`${r.nickname} would like ${r.minutes} minutes`}</Text>
                      <Text variant="meta" color="textMeta">
                        {r.priceNaira > 0 ? `₦${r.priceNaira.toLocaleString('en-NG')}` : 'Free'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: space[3] }}>
                        <Button label="Accept" onPress={() => void answer(r, true)} style={{ flex: 1 }} />
                        <Button label="Decline" variant="quiet" onPress={() => void answer(r, false)} style={{ flex: 1 }} />
                      </View>
                    </View>
                  )}
                />
              </View>
            )}
          </>
        )}
      </View>

      {form ? (
        <View style={{ gap: space[3] }}>
          <Text variant="heading" accessibilityRole="header">
            Your card
          </Text>
          <TextField label="Intro" value={form.intro} onChangeText={(intro) => setForm({ ...form, intro })} maxLength={150} multiline />
          <Text variant="bodyStrong">Topics</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {TOPICS.map((t) => (
              <FilterChip
                key={t}
                label={t}
                selected={form.topics.includes(t)}
                onPress={() => setForm({ ...form, topics: form.topics.includes(t) ? form.topics.filter((x) => x !== t) : [...form.topics, t] })}
              />
            ))}
          </View>
          <Text variant="bodyStrong">Languages</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {LANGUAGES.map((l) => (
              <FilterChip
                key={l}
                label={l}
                selected={form.languages.includes(l)}
                onPress={() => setForm({ ...form, languages: form.languages.includes(l) ? form.languages.filter((x) => x !== l) : [...form.languages, l] })}
              />
            ))}
          </View>
          <SwitchRow title="Offer one-on-one" line="People can ask you for a private session." value={form.offers} onChange={(offers) => setForm({ ...form, offers })} />
          <Text variant="bodyStrong">Session length</Text>
          {MINUTES.map((m) => (
            <RadioRow key={m} title={`${m} minutes`} selected={form.minutes === m} onPress={() => setForm({ ...form, minutes: m })} />
          ))}
          {pro ? (
            <>
              <TextField
                label="Price for one session, in naira"
                helper="Leave empty for free. Shown before anyone asks, and never changed during a session."
                value={form.price}
                onChangeText={(price) => setForm({ ...form, price: price.replace(/[^\d]/g, '') })}
                keyboardType="number-pad"
                maxLength={6}
              />
              <SwitchRow
                title="First session free"
                line="A full session, never cut short."
                value={form.freeFirst}
                onChange={(freeFirst) => setForm({ ...form, freeFirst })}
              />
            </>
          ) : (
            <Text variant="meta" color="textMeta">
              Trained listeners are always free.
            </Text>
          )}
          <Button label="Save my card" loading={saving} onPress={() => void save()} />
        </View>
      ) : null}
    </DoorLayout>
  );
}
