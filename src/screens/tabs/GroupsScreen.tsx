import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Lock, Plus } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { FilterChip } from '../../components/FilterChip';
import { Sheet } from '../../components/Sheet';
import { TopIcon } from '../../components/TopIcon';
import { ShowSome } from '../../components/ShowSome';
import { InviteSheet } from '../../components/InviteSheet';
import { WEB_URL } from '../../config';
import { GroupCard, LoadError, SkeletonRows } from '../../components/Scheduled';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { myConnections, type PersonRef } from '../../lib/people';
import { clockWords, dayAndTime, inWords } from '../../lib/when';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import type { InviteTarget, RoomRequest } from '../../rooms/api';
import { dismissInvitation, markInvitationsSeen, myInvitations, type Invitation } from '../../rooms/invitations';
import { canGoIn, cancelScheduled, setReminder, type Group, type ScheduledRoom } from '../../rooms/schedule';
import { allowReminders, reminderNote } from '../../lib/reminders';
import { alertsAllowed, turnOnAlerts } from '../../lib/push';
import { useSchedule } from '../../rooms/useSchedule';
import { motion, opacity, radius, size, space, useColors } from '../../theme';

// People (was Groups; Sammy, 2026-10-11): Next up and invitations on top, then Friends | Groups.
// Friends are people you saved who saved you back; groups meet every week. It replaces the separate
// "My people" page, which Home's Friends card used to open.
export function GroupsScreen({
  me,
  nickname,
  notice,
  show = 'friends',
  onEnter,
  onExplore,
  onStartGroup,
  onOpenGroup,
  onSeenInvitations,
}: {
  me: { id: string };
  nickname: string;
  // A note to show once on arrival, e.g. "Ludo night is set for tonight at 8 pm. We'll remind you."
  notice?: string;
  // Which side opens first.
  show?: 'friends' | 'groups';
  onEnter: (r: RoomRequest) => void;
  onExplore: () => void;
  onStartGroup: () => void;
  onOpenGroup: (groupId: string, first?: Group) => void;
  // Opening Groups clears the dot on its tab.
  onSeenInvitations?: () => void;
}) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('groups');
  const [people, setPeople] = useState<PersonRef[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [side, setSide] = useState(show);
  // The + at the top: what you can start from here.
  const [adding, setAdding] = useState(false);
  const schedule = useSchedule(me.id, true);
  // Invite a friend: a link to Circles, for someone who isn't a friend here yet.
  const shareCircles = async () => {
    try {
      await Share.share({ message: `Come and talk with me on Circles: ${WEB_URL}` });
    } catch {
      // They closed the share sheet.
    }
  };
  const [toast, setToast] = useState<string | null>(notice ?? null);
  const now = Date.now();
  // Yours: rooms you set a reminder for, made, or that your groups meet in. Not ones already over.
  const yours = (schedule.rooms ?? []).filter((r) => (r.reminded || r.regular || r.mine) && r.startsAt.getTime() > now - 2 * 60 * 60_000);
  const nextUp: ScheduledRoom | null = yours[0] ?? null;
  const myGroups = (schedule.groups ?? []).filter((g) => g.regular || g.mine);
  // Rooms you scheduled yourself (not group meetings): you can cancel them.
  const made = (schedule.rooms ?? []).filter((r) => r.mine && !r.groupId && r.startsAt.getTime() > now);
  const reminders = (schedule.rooms ?? []).filter((r) => r.reminded && !r.regular && !r.mine && r.startsAt.getTime() > now);
  const cancel = (room: ScheduledRoom) =>
    Alert.alert(`Cancel ${room.title}?`, 'It leaves Rooms, and nobody gets a reminder for it.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel it',
        style: 'destructive',
        onPress: () =>
          void cancelScheduled(room.id)
            .then(() => {
              setToast(`${room.title} is cancelled.`);
              return schedule.load();
            })
            .catch(() => setToast("That didn't work. Check that you're online.")),
      },
    ]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  // Alerts when your people invite you: offered once there's someone who could.
  const [alertsOn, setAlertsOn] = useState(true);
  useEffect(() => {
    void alertsAllowed().then(setAlertsOn);
    // Back from the phone's settings: the row goes away once alerts are allowed.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void alertsAllowed().then(setAlertsOn);
    });
    return () => sub.remove();
  }, []);
  const [inviting, setInviting] = useState<{ target: InviteTarget; title: string } | null>(null);
  const loadInvites = useCallback(async () => {
    try {
      setInvites(await myInvitations());
      // Seen while Groups is open, so the tab's dot doesn't come back for these.
      await markInvitationsSeen(me.id);
      onSeenInvitations?.();
    } catch {
      // Shown next time; the rest of the page still works.
    }
  }, [me.id, onSeenInvitations]);
  useEffect(() => {
    void loadInvites();
    const timer = setInterval(() => void loadInvites(), 60_000);
    return () => clearInterval(timer);
  }, [loadInvites]);

  const notNow = (inv: Invitation) => {
    setInvites((list) => list.filter((i) => i.id !== inv.id));
    void dismissInvitation(inv.id).catch(() => {});
  };
  // Join: a live room opens; a scheduled room opens if it's time, otherwise it's added to your
  // reminders; a group opens its page, where you can join it.
  const accept = async (inv: Invitation) => {
    if (inv.kind === 'group' && inv.groupId) {
      onOpenGroup(inv.groupId);
      return;
    }
    // Not dismissed here: if the room is full or has ended, the invitation runs out by itself.
    if (inv.kind === 'room' && inv.roomId) {
      onEnter({ kind: 'join', roomId: inv.roomId, ...(inv.door === 'learn' ? {} : { door: inv.door }) });
      return;
    }
    if (inv.scheduledId) {
      if (inv.startsAt && canGoIn(inv.startsAt)) {
        onEnter({ kind: 'scheduled', scheduledId: inv.scheduledId });
        return;
      }
      try {
        await setReminder(inv.scheduledId, true);
        notNow(inv);
        setToast(`${inv.title} is in your reminders. ${reminderNote(await allowReminders())}`.trim());
        void schedule.load();
      } catch {
        setToast("That didn't work. Check that you're online.");
      }
    }
  };
  const inviteWhen = (inv: Invitation) =>
    inv.kind === 'room' ? 'Going on now' : inv.kind === 'group' ? 'A weekly group' : inv.startsAt ? dayAndTime(inv.startsAt) : '';

  const toggle = async (room: ScheduledRoom) => {
    setToast(await schedule.toggleReminder(room));
  };

  const load = useCallback(async () => {
    try {
      setPeople(await myConnections());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[4], paddingBottom: space[7], gap: space[6] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.textMeta}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([load(), schedule.load(), loadInvites()]);
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
            People
          </Text>
          <TopIcon Icon={Plus} label={WEB_URL ? 'New: a group, a room with friends, or an invite' : 'New: a group or a room with friends'} onPress={() => setAdding(true)} />
        </View>

        {schedule.failed && !schedule.rooms ? (
          <LoadError what="your groups and reminders" onRetry={() => void schedule.load()} />
        ) : schedule.rooms === null ? (
          <SkeletonRows />
        ) : null}

        {nextUp ? (
          <View style={{ gap: space[2], backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4] }}>
            <Text variant="metaStrong" color="textSoft" accessibilityRole="header">
              Next up
            </Text>
            <Text variant="title">
              {nextUp.startsAt.getTime() - now < 60 * 60_000 ? inWords(nextUp.startsAt) : dayAndTime(nextUp.startsAt)}
            </Text>
            <Text variant="bodyStrong" numberOfLines={1}>
              {nextUp.title}
            </Text>
            {canGoIn(nextUp.startsAt) ? (
              <Button label="Go in" onPress={() => onEnter({ kind: 'scheduled', scheduledId: nextUp.id })} />
            ) : (
              <Text variant="meta" color="textMeta">
                {"We'll remind you 15 minutes before. Go in opens 5 minutes before."}
              </Text>
            )}
          </View>
        ) : null}

        {invites.length > 0 ? (
          <View style={{ gap: space[1] }}>
            <Text variant="heading" accessibilityRole="header">
              Invitations
            </Text>
            {invites.map((inv) => (
              <View key={inv.id} style={{ gap: space[2], paddingVertical: space[3] }}>
                <View accessible style={{ gap: space[1] }}>
                  <Text variant="bodyStrong">{`${inv.fromNickname} invited you to ${inv.title}`}</Text>
                  <Text variant="meta" color="textMeta">
                    {inviteWhen(inv)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: space[3] }}>
                  <Button label="Join" onPress={() => void accept(inv)} style={{ flex: 1 }} />
                  <Button label="Not now" variant="quiet" onPress={() => notNow(inv)} style={{ flex: 1 }} />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View accessibilityRole="radiogroup" accessibilityLabel="Show" style={{ flexDirection: 'row', gap: space[2] }}>
          <FilterChip label="Friends" selected={side === 'friends'} onPress={() => setSide('friends')} />
          <FilterChip label="Groups" selected={side === 'groups'} onPress={() => setSide('groups')} />
        </View>

        {side === 'friends' ? (
          <View style={{ gap: space[4] }}>
            {failed ? (
              <View style={{ gap: space[2] }}>
                <Text variant="body" color="textSoft">
                  {"We couldn't load your friends. Check that you're online."}
                </Text>
                <Button label="Try again" variant="quiet" onPress={() => void load()} />
              </View>
            ) : people === null ? (
              <SkeletonRows />
            ) : people.length === 0 ? (
              <View style={{ gap: space[2] }}>
                <Text variant="heading">No friends yet</Text>
                <Text variant="body" color="textSoft">
                  {'After a room, save people you clicked with. If they save you back, they show up here.'}
                </Text>
                {/* Needs the web version's address for the link; hidden until it's online. */}
                {WEB_URL ? (
                  <Button label="Invite a friend" variant="primary" onPress={() => void shareCircles()} />
                ) : (
                  <Button label="Find a room" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'talk', mood: null })} />
                )}
              </View>
            ) : (
              <>
                <View style={{ gap: space[2] }}>
                  <Button
                    label="Start a room with friends"
                    variant="primary"
                    onPress={() =>
                      onEnter({ kind: 'create', door: 'talk', title: `${nickname} and friends`, topic: null, capacity: 6, private: true })
                    }
                  />
                  <Text variant="meta" color="textMeta" center>
                    Only people you invite can join. It opens now, with you in it.
                  </Text>
                </View>
                <View>
                  <ShowSome
                    items={people}
                    noun="friends"
                    render={(p) => (
                      <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.minTarget + space[2] }}>
                        <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
                        <Text variant="bodyStrong">{p.nickname}</Text>
                      </View>
                    )}
                  />
                </View>
                {!alertsOn ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                    <Bell size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
                    <Text variant="meta" color="textSoft" style={{ flex: 1 }}>
                      Get an alert when your friends invite you.
                    </Text>
                    <Button
                      label="Turn on"
                      onPress={() =>
                        void turnOnAlerts().then((on) => {
                          setAlertsOn(on);
                          if (!on) setToast("Your phone said no. You can allow notifications for Circles in your phone's settings.");
                        })
                      }
                      style={{ width: size.rowAction }}
                    />
                  </View>
                ) : null}
                {/* Once there are friends to not see it; the same name as the Home support card. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                  <Lock size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
                  <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
                    {'Only you and each friend see that you\'re friends. They never see when you\'re in a "Need someone to talk to?" room.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={{ gap: space[5] }}>
            {schedule.groups && myGroups.length === 0 ? (
              <View style={{ gap: space[2] }}>
                <Text variant="heading">No groups yet</Text>
                <Text variant="body" color="textSoft">
                  Small circles that meet every week. You get a reminder before each meetup.
                </Text>
                <Button label="Create a group" variant="primary" onPress={onStartGroup} />
                {/* Finding groups lives in Rooms › Every week; this only points there. */}
                <Button label="Find groups in Rooms" variant="secondary" onPress={onExplore} />
              </View>
            ) : null}

            {myGroups.length > 0 ? (
              <View style={{ gap: space[3] }}>
                <Text variant="heading" accessibilityRole="header">
                  Your groups
                </Text>
                <ShowSome items={myGroups} noun="groups" render={(g) => (
                  <GroupCard key={g.id} group={g} onPress={() => onOpenGroup(g.id, g)} />
                )} />
              </View>
            ) : null}

            {made.length > 0 ? (
              <View style={{ gap: space[1] }}>
                <Text variant="heading" accessibilityRole="header">
                  Rooms you scheduled
                </Text>
                <ShowSome items={made} noun="scheduled rooms" render={(r) => (
                  <View key={r.id} style={{ gap: space[2], paddingVertical: space[3] }}>
                    <View style={{ gap: space[1] }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {r.title}
                      </Text>
                      <Text variant="meta" color="textMeta">
                        {`${dayAndTime(r.startsAt)}. ${r.going} going${r.private ? '. Invite only' : ''}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: space[3] }}>
                      <Button
                        label="Invite"
                        onPress={() => setInviting({ target: { scheduledId: r.id }, title: r.title })}
                        style={{ flex: 1 }}
                      />
                      <Button label="Cancel" variant="quiet" onPress={() => cancel(r)} style={{ flex: 1 }} />
                    </View>
                  </View>
                )} />
              </View>
            ) : null}

            {reminders.length > 0 ? (
              <View style={{ gap: space[1] }}>
                <Text variant="heading" accessibilityRole="header">
                  Your reminders
                </Text>
                <ShowSome items={reminders} noun="reminders" render={(r) => (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.minTarget + space[2] }}>
                    <View style={{ flex: 1, gap: space[1] }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {r.title}
                      </Text>
                      <Text variant="meta" color="textMeta">
                        {dayAndTime(r.startsAt)}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove the reminder for ${r.title} at ${clockWords(r.startsAt)}`}
                      onPress={() => void toggle(r)}
                      style={({ pressed }) => ({
                        width: size.minTarget,
                        height: size.minTarget,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? opacity.pressed : 1,
                      })}
                    >
                      <Bell size={size.icon} color={colors.text} fill={colors.text} strokeWidth={size.iconStroke} />
                    </Pressable>
                  </View>
                )} />
              </View>
            ) : null}
            {myGroups.length > 0 ? (
              <View style={{ gap: space[2] }}>
                <Button label="Create a group" variant="secondary" onPress={onStartGroup} />
                <Button label="Find groups in Rooms" variant="quiet" onPress={onExplore} />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: space[4] }} pointerEvents="none">
        <Toast message={toast} onDone={() => setToast(null)} />
      </View>
      <Sheet visible={adding} onClose={() => setAdding(false)}>
        <Text variant="title" accessibilityRole="header">
          New
        </Text>
        <View style={{ gap: space[3] }}>
          <Button
            label="Create a group"
            onPress={() => {
              setAdding(false);
              onStartGroup();
            }}
          />
          {people && people.length > 0 ? (
            <Button
              label="Start a room with friends"
              onPress={() => {
                setAdding(false);
                onEnter({ kind: 'create', door: 'talk', title: `${nickname} and friends`, topic: null, capacity: 6, private: true });
              }}
            />
          ) : null}
          {/* Needs the web version's address for the link; hidden until it's online. */}
          {WEB_URL ? (
            <Button
              label="Invite a friend to Circles"
              onPress={() => {
                setAdding(false);
                // After the sheet has closed: iPhones won't open the share panel over a closing one.
                setTimeout(() => void shareCircles(), motion.slow);
              }}
            />
          ) : null}
          <Button label="Cancel" variant="quiet" onPress={() => setAdding(false)} />
        </View>
      </Sheet>
      <InviteSheet
        visible={!!inviting}
        target={inviting?.target ?? null}
        title={inviting?.title ?? ''}
        onClose={() => setInviting(null)}
        onSent={(note) => {
          setInviting(null);
          setToast(note);
        }}
      />
    </SafeAreaView>
  );
}
