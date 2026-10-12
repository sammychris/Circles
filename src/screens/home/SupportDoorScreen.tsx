import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BadgeCheck, ChevronRight, Heart, Lock, Shield } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Glow } from '../../components/Glow';
import { HelpModal } from '../../components/HelpModal';
import { ShowSome } from '../../components/ShowSome';
import { ReportSheet } from '../../components/ReportSheet';
import { HostCardSheet, RequestSheet } from '../../components/support/HostCardSheet';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { turnOnAlerts } from '../../lib/push';
import { listSupportRooms, supportStatus, type RoomRequest, type SupportRoom } from '../../rooms/api';
import {
  BADGE,
  OneOnOneError,
  cancelRequest,
  hostName,
  listOneOnOneHosts,
  myRequest,
  notifyWhenHostOn,
  priceWords,
  requestOneOnOne,
  type HostCard,
  type MyRequest,
} from '../../support/api';
import { motion, opacity, radius, size, space, useColors } from '../../theme';

type Props = { onBack: () => void; onEnter: (request: RoomRequest) => void; onBecomeHost: () => void };

// A one-on-one request waiting for its host's answer, kept on this phone so leaving the page doesn't lose it.
const WAITING_KEY = 'circles.oneOnOne';

// "Someone to talk to" (support-section-spec.md; CIRCLES_INTENT.md › Support). Two ways in: free support
// rooms with a host (3 people before anyone talks), and optional one-on-one with a trusted host or a
// professional. Nobody, not even friends, ever sees that someone is here.
export function SupportDoorScreen({ onBack, onEnter, onBecomeHost }: Props) {
  const colors = useColors();
  const [status, setStatus] = useState<{ hostInRoom: boolean; iAmHost: boolean } | null>(null);
  const [rooms, setRooms] = useState<SupportRoom[] | null>(null);
  const [hosts, setHosts] = useState<HostCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [card, setCard] = useState<HostCard | null>(null);
  const [asking, setAsking] = useState<HostCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [waitingId, setWaitingId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<MyRequest | null>(null);
  const [notified, setNotified] = useState(false);
  const [reporting, setReporting] = useState<{ id: string; nickname: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r, h] = await Promise.all([supportStatus(), listSupportRooms(), listOneOnOneHosts()]);
      setStatus(s);
      setRooms(r);
      setHosts(h);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);

  // A request from before: pick it up again.
  useEffect(() => {
    void AsyncStorage.getItem(WAITING_KEY)
      .then((id) => setWaitingId(id))
      .catch(() => {});
  }, []);

  // While a request waits: check every few seconds. Yes opens the room; anything else says so kindly.
  useEffect(() => {
    if (!waitingId) return;
    let stop = false;
    const check = async () => {
      try {
        const r = await myRequest(waitingId);
        if (stop) return;
        setWaiting(r);
        if (!r || r.status !== 'pending') {
          void AsyncStorage.removeItem(WAITING_KEY).catch(() => {});
          setWaitingId(null);
        }
        if (r?.status === 'accepted' && r.roomId && r.endsAt && Date.parse(r.endsAt) > Date.now()) {
          onEnter({ kind: 'join', roomId: r.roomId, oneOnOneId: waitingId });
        } else if (r && (r.status === 'declined' || r.status === 'expired')) {
          setToast(`${r.hostNickname} isn't available right now. Try another host?`);
        }
      } catch {
        // Checked again in a moment.
      }
    };
    void check();
    const timer = setInterval(() => void check(), 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [waitingId, onEnter]);

  const ask = async (c: HostCard) => {
    setBusy(true);
    try {
      const id = await requestOneOnOne(c.userId);
      await AsyncStorage.setItem(WAITING_KEY, id).catch(() => {});
      setAsking(null);
      setWaiting(null);
      setWaitingId(id);
    } catch (e) {
      const code = e instanceof OneOnOneError ? e.code : 'other';
      setAsking(null);
      setToast(
        code === 'adults_only'
          ? 'One-on-one is for people 18 and over. Tap Come in or join any room first, and answer the age question there.'
          : code === 'already_waiting'
          ? "You're already waiting for an answer."
          : code === 'payment_needed'
            ? "Paying in the app is coming soon, so paid sessions can't be booked yet."
            : code === 'too_many'
              ? "You've asked a few times. Try again in a while."
              : code === 'not_available'
                ? `${hostName(c)} isn't available right now. Try another host?`
                : "That didn't work. Check that you're online.",
      );
      void load();
    } finally {
      setBusy(false);
    }
  };

  const notifyMe = async () => {
    try {
      const allowed = await turnOnAlerts();
      if (!allowed) {
        setToast("Your phone said no to alerts. You can allow them for Circles in your phone's settings.");
        return;
      }
      await notifyWhenHostOn();
      setNotified(true);
      setToast("We'll send you one alert when a host is on.");
    } catch {
      setToast("That didn't work. Check that you're online.");
    }
  };

  const open = status?.hostInRoom || status?.iAmHost;

  return (
    <DoorLayout
      title=""
      onBack={onBack}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      footer={toast ? <Toast message={toast} onDone={() => setToast(null)} /> : undefined}
      header={
        <View style={{ alignItems: 'center', gap: space[4] }}>
          <View style={{ width: size.avatarRoom * 2, height: size.avatarRoom * 2, alignItems: 'center', justifyContent: 'center' }}>
            <Glow diameter={size.avatarRoom * 3} centerX={size.avatarRoom} centerY={size.avatarRoom} />
            <View
              style={{
                width: size.avatarRoom,
                height: size.avatarRoom,
                borderRadius: radius.pill,
                backgroundColor: colors.emberSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={size.icon} color={colors.emberText} fill={colors.emberText} strokeWidth={size.iconStroke} />
            </View>
          </View>
          <Text variant="display" center accessibilityRole="header">
            Someone to talk to
          </Text>
          <Text variant="body" color="textSoft" center>
            Kind people and a trained host. No judging, no rush.
          </Text>
          {/* Above everything else, and a real button: someone in crisis shouldn't have to find a link. */}
          <Button label="In crisis? Get help now" variant="secondary" onPress={() => setHelpOpen(true)} style={{ alignSelf: 'stretch' }} />
        </View>
      }
    >
      {waitingId ? (
        <View style={{ gap: space[2], backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4] }} accessibilityLiveRegion="polite">
          <Text variant="bodyStrong">{waiting ? `Waiting for ${waiting.hostNickname} to answer…` : 'Waiting for an answer…'}</Text>
          <Text variant="meta" color="textSoft">
            {"Stay on this page. When they say yes, you'll go straight in. If they can't, we'll tell you."}
          </Text>
          <Button
            label="Cancel request"
            variant="quiet"
            onPress={() => {
              const id = waitingId;
              setWaitingId(null);
              setWaiting(null);
              void AsyncStorage.removeItem(WAITING_KEY).catch(() => {});
              void cancelRequest(id);
            }}
          />
        </View>
      ) : null}

      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="heading" accessibilityRole="header">
            Support rooms
          </Text>
          <Text variant="meta" color="textMeta">
            Free · group
          </Text>
        </View>
        {status === null && !failed ? (
          <Button label="Checking for a host" variant="primary" loading onPress={() => {}} />
        ) : failed && status === null ? (
          <View style={{ gap: space[2] }}>
            <Text variant="body" color="textSoft">
              {"Couldn't load. Check that you're online."}
            </Text>
            <Button label="Try again" variant="quiet" onPress={() => void load()} />
          </View>
        ) : (
          <>
            {(rooms ?? []).length > 0 ? (
              <View>
                <ShowSome
                  items={rooms ?? []}
                  noun="support rooms"
                  render={(r) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.title}. Host ${r.host}, ${BADGE[r.hostKind]}. ${r.here} in. Join and listen`}
                      disabled={r.here >= r.capacity}
                      onPress={() => onEnter({ kind: 'join', roomId: r.id })}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space[3],
                        minHeight: size.avatarRoom,
                        opacity: r.here >= r.capacity ? opacity.disabled : pressed ? opacity.pressed : 1,
                      })}
                    >
                      <View style={{ width: space[2], height: space[2], borderRadius: radius.pill, backgroundColor: colors.live }} />
                      <View style={{ flex: 1, gap: space[1] }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {`Live · ${r.title}`}
                        </Text>
                        <Text variant="meta" color="textSoft" numberOfLines={1}>
                          {`Host: ${r.host} · ${BADGE[r.hostKind]} · ${r.here >= r.capacity ? 'Full' : `${r.here} in`}`}
                        </Text>
                      </View>
                      <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
                        Join
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            ) : null}
            {open ? (
              <>
                <Button label="Come in" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'support', mood: null })} />
                <Text variant="meta" color="textMeta" center>
                  {status?.iAmHost && !status.hostInRoom ? "You're a host, so you'll open a room." : 'Join and listen first. Your mic starts off.'}
                </Text>
              </>
            ) : (
              // Bad news at body size, never as loud as the title, and something to do about it.
              <View style={{ gap: space[2] }}>
                <Text variant="body" color="textSoft">
                  No support room is live right now. Rooms always have a trained host.
                </Text>
                <Button
                  label={notified ? "We'll let you know" : 'Notify me when one starts'}
                  variant="primary"
                  disabled={notified}
                  onPress={() => void notifyMe()}
                />
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="heading" accessibilityRole="header">
            One-on-one
          </Text>
          <Text variant="meta" color="textMeta">
            Private · optional
          </Text>
        </View>
        {hosts === null ? null : hosts.length === 0 ? (
          <Text variant="body" color="textSoft">
            No hosts are free for one-on-one right now.
          </Text>
        ) : (
          <View>
            <ShowSome
              items={hosts}
              noun="hosts"
              render={(h) => {
                const pro = h.kind === 'professional';
                const Icon = pro ? BadgeCheck : Shield;
                return (
                  <Pressable
                    key={h.userId}
                    accessibilityRole="button"
                    accessibilityLabel={`${hostName(h)}, ${BADGE[h.kind]}. ${priceWords(h)}. ${h.languages.join(', ')}. Online now`}
                    onPress={() => setCard(h)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.avatarRoom, opacity: pressed ? opacity.pressed : 1 })}
                  >
                    <Icon size={size.icon} color={pro ? colors.live : colors.textSoft} strokeWidth={size.iconStroke} />
                    <View style={{ flex: 1, gap: space[1] }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{`${hostName(h)} · ${BADGE[h.kind]}`}</Text>
                      <Text variant="meta" color="textSoft" numberOfLines={1}>
                        {`${priceWords(h)} · ${h.languages.join(', ') || 'English'} · Online now`}
                      </Text>
                    </View>
                    <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </View>

      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Lock size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
          <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
            Nobody, not even friends, sees you're here
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onBecomeHost}
          style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[1] }}
        >
          <Text variant="meta" color="textSoft">
            Want to help others?
          </Text>
          <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
            Become a host
          </Text>
        </Pressable>
      </View>

      <HostCardSheet
        card={card}
        onClose={() => setCard(null)}
        onRequest={
          waitingId
            ? undefined
            : (c) => {
                setCard(null);
                // Let the card slide away first: two sheets can't swap in the same moment on every phone.
                setTimeout(() => setAsking(c), motion.slow);
              }
        }
        onReport={(c) => {
          setCard(null);
          setTimeout(() => setReporting({ id: c.userId, nickname: c.nickname }), motion.slow);
        }}
      />
      <ReportSheet
        visible={!!reporting}
        roomId={null}
        people={reporting ? [reporting] : []}
        startWith={reporting}
        onClose={() => setReporting(null)}
        onAlsoBlock={() => {}}
        onSeeHelp={() => {
          setReporting(null);
          setTimeout(() => setHelpOpen(true), motion.slow);
        }}
      />
      <RequestSheet card={asking} busy={busy} onClose={() => setAsking(null)} onConfirm={(c) => void ask(c)} />
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} inRoom={false} />
    </DoorLayout>
  );
}
