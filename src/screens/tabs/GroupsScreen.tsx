import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CalendarClock, Lock } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { GroupCard } from '../../components/Scheduled';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { WEB_URL } from '../../config';
import { myConnections, type PersonRef } from '../../lib/people';
import { clockWords, dayAndTime, inWords } from '../../lib/when';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import type { RoomRequest } from '../../rooms/api';
import { canGoIn, type Group, type ScheduledRoom } from '../../rooms/schedule';
import { useSchedule } from '../../rooms/useSchedule';
import { opacity, radius, size, space, useColors } from '../../theme';

// How many faces show in the My people row before "and 4 more".
const FACES = 6;

// Groups: what's yours (docs/design/pages/tabs.md › Groups): Next up, your groups, My people and
// your reminders. Invitations come next.
export function GroupsScreen({
  me,
  nickname,
  notice,
  onEnter,
  onExplore,
  onOpenPeople,
  onStartGroup,
  onOpenGroup,
}: {
  me: { id: string };
  nickname: string;
  // A note to show once on arrival, e.g. "Ludo night is set for tonight at 8 pm. We'll remind you."
  notice?: string;
  onEnter: (r: RoomRequest) => void;
  onExplore: () => void;
  // The full My people list.
  onOpenPeople: () => void;
  onStartGroup: () => void;
  onOpenGroup: (group: Group) => void;
}) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('groups');
  const [people, setPeople] = useState<PersonRef[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const schedule = useSchedule(me.id, true);
  const [toast, setToast] = useState<string | null>(notice ?? null);
  const now = Date.now();
  // Yours: rooms you set a reminder for, made, or that your groups meet in. Not ones already over.
  const yours = (schedule.rooms ?? []).filter((r) => (r.reminded || r.regular || r.mine) && r.startsAt.getTime() > now - 2 * 60 * 60_000);
  const nextUp: ScheduledRoom | null = yours[0] ?? null;
  const myGroups = (schedule.groups ?? []).filter((g) => g.regular || g.mine);
  const reminders = (schedule.rooms ?? []).filter((r) => r.reminded && !r.regular && r.startsAt.getTime() > now);
  const toggle = async (room: ScheduledRoom) => {
    if (await schedule.toggleReminder(room)) setToast(room.reminded ? 'Reminder removed.' : "We'll remind you.");
    else setToast("That didn't work. Check that you're online.");
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
              await Promise.all([load(), schedule.load()]);
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ gap: space[4] }}>
          <Text variant="title" accessibilityRole="header">
            Groups
          </Text>
          <Button label="Start a group" variant="primary" onPress={onStartGroup} />
        </View>

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

        {myGroups.length > 0 ? (
          <View style={{ gap: space[3] }}>
            <Text variant="heading" accessibilityRole="header">
              Your groups
            </Text>
            {myGroups.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => onOpenGroup(g)} />
            ))}
          </View>
        ) : null}

        <View style={{ gap: space[3] }}>
          <Text variant="heading" accessibilityRole="header">
            My people
          </Text>
          <Text variant="body" color="textSoft">
            People you saved who saved you too. Only the two of you ever see it.
          </Text>
          {failed ? (
            <View style={{ gap: space[2] }}>
              <Text variant="body" color="textSoft">
                {"We couldn't load your people. Check that you're online."}
              </Text>
              <Button label="Try again" variant="quiet" onPress={() => void load()} />
            </View>
          ) : people === null ? (
            <View style={{ flexDirection: 'row', gap: space[2] }} accessibilityLabel="Loading">
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{ width: size.avatarList, height: size.avatarList, borderRadius: radius.pill, backgroundColor: colors.raised }}
                />
              ))}
            </View>
          ) : people.length === 0 ? (
            <Text variant="body" color="textSoft">
              {"Nobody yet. After a room, save the people you clicked with. If they save you too, they'll show up here."}
            </Text>
          ) : (
            <View
              accessible
              accessibilityLabel={`${people
                .slice(0, FACES)
                .map((p) => p.nickname)
                .join(', ')}${people.length > FACES ? `, and ${people.length - FACES} more` : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] }}
            >
              {people.slice(0, FACES).map((p) => (
                <View key={p.id} style={{ alignItems: 'center', gap: space[1], width: size.avatarList + space[4] }}>
                  <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
                  <Text variant="tiny" color="textSoft" numberOfLines={1}>
                    {p.nickname}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {people && people.length > FACES ? (
            <Pressable accessibilityRole="button" onPress={onOpenPeople} style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
              <Text
                variant="metaStrong"
                color="textSoft"
                style={{ textDecorationLine: 'underline' }}
              >{`and ${people.length - FACES} more`}</Text>
            </Pressable>
          ) : null}
          <Button
            label="Start a room with friends"
            disabled={!WEB_URL}
            onPress={() =>
              onEnter({ kind: 'create', door: 'talk', title: `${nickname} and friends`, topic: null, capacity: 6, private: true })
            }
          />
          <Text variant="meta" color="textMeta">
            {WEB_URL
              ? 'Only people you send the link to can join. It opens now, with you in it.'
              : 'Comes once the web version of Circles is online, so invite links work.'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Lock size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
            <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
              {"Friends never see when you're in a support room."}
            </Text>
          </View>
        </View>

        {reminders.length > 0 ? (
          <View style={{ gap: space[1] }}>
            <Text variant="heading" accessibilityRole="header">
              Your reminders
            </Text>
            {reminders.map((r) => (
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
            ))}
          </View>
        ) : null}

        {schedule.rooms && schedule.groups && myGroups.length === 0 && reminders.length === 0 && !nextUp ? (
          <View style={{ gap: space[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <CalendarClock size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
              <Text variant="body" color="textSoft" style={{ flex: 1 }}>
                Your groups and reminders will show here.
              </Text>
            </View>
            <Button label="Explore groups" onPress={onExplore} />
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: space[4] }} pointerEvents="none">
        <Toast message={toast} onDone={() => setToast(null)} />
      </View>
    </SafeAreaView>
  );
}
