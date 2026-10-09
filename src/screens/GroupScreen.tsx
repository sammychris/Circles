import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { CalendarClock, Lock, Users } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { DoorLayout } from '../components/DoorLayout';
import { ErrorLine } from '../components/ErrorLine';
import { InviteSheet } from '../components/InviteSheet';
import { LoadError, SkeletonRows } from '../components/Scheduled';
import { Text } from '../components/Text';
import { Toast } from '../components/Toast';
import { allowReminders, reminderNote, syncReminders } from '../lib/reminders';
import { dayAndTime, inWords, weeklyWords } from '../lib/when';
import type { RoomRequest } from '../rooms/api';
import { levelLabel, subjectById } from '../rooms/learn';
import {
  canGoIn,
  endGroup,
  GroupFullError,
  joinGroup,
  leaveGroup,
  listGroups,
  upcomingRooms,
  type Group,
  type ScheduledRoom,
} from '../rooms/schedule';
import { topicLabel } from '../rooms/start';
import { border, size, space, useColors } from '../theme';

type Props = {
  me: { id: string };
  groupId: string;
  // What the card already showed, so the page isn't blank while it loads.
  first?: Group;
  backLabel: string;
  onBack: () => void;
  onEnter: (r: RoomRequest) => void;
};

// A weekly group (docs/design/pages/circle-detail.md): everything you need to decide whether to become
// a regular. Regulars are shown as a count only, never who.
export function GroupScreen({ me, groupId, first, backLabel, onBack, onEnter }: Props) {
  const colors = useColors();
  const [group, setGroup] = useState<Group | null | undefined>(first);
  const [meetings, setMeetings] = useState<ScheduledRoom[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [groups, rooms] = await Promise.all([listGroups(), upcomingRooms()]);
      setGroup(groups.find((g) => g.id === groupId) ?? null);
      setMeetings(rooms.filter((r) => r.groupId === groupId).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()));
      setFailed(false);
      void syncReminders(me.id, rooms);
    } catch {
      setFailed(true);
    }
  }, [groupId, me.id]);

  useEffect(() => {
    void load();
    // Go in appears by itself 5 minutes before a meeting.
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  // `work` can return the note to show, instead of `done`.
  const act = async (work: () => Promise<string | void>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      setToast((await work()) || done);
      await load();
    } catch (e) {
      setError(e instanceof GroupFullError ? 'This group just filled up.' : "That didn't work. Check that you're online, then try again.");
    } finally {
      setBusy(false);
    }
  };

  if (group === null) {
    return <DoorLayout title="This group has ended" line="Its meetings won't happen any more." onBack={onBack} backLabel={backLabel} />;
  }
  if (!group) {
    return (
      <DoorLayout title="" onBack={onBack} backLabel={backLabel}>
        {failed ? <LoadError what="this group" onRetry={() => void load()} /> : <SkeletonRows rows={3} />}
      </DoorLayout>
    );
  }

  const next = meetings.find((m) => m.startsAt.getTime() > Date.now() - 2 * 60 * 60_000) ?? null;
  const live = next && canGoIn(next.startsAt) ? next : null;
  const joined = group.regular || group.mine;
  const full = !joined && group.regulars >= group.capacity;
  const about =
    group.door === 'learn'
      ? [subjectById(group.language ?? undefined)?.name, levelLabel(group.level)].filter(Boolean).join(', ')
      : (topicLabel(group.topic) ?? (group.door === 'play' ? 'Game group' : 'Talk group'));
  const regulars = `${group.regulars} of ${group.capacity} ${group.capacity === 1 ? 'regular' : 'regulars'}`;

  const footer = live ? (
    <Button label="Go in" variant="primary" onPress={() => onEnter({ kind: 'scheduled', scheduledId: live.id })} />
  ) : joined ? (
    <Text variant="meta" color="textSoft" center>
      {group.mine ? "You host this group. We'll remind you 15 minutes before." : "You're a regular. We'll remind you 15 minutes before."}
    </Text>
  ) : full ? (
    <>
      <Button label="Full" variant="primary" disabled onPress={() => {}} />
      <Text variant="meta" color="textMeta" center>
        {`Full. ${regulars}.`}
      </Text>
    </>
  ) : (
    <>
      <Button
        label="Join this group"
        variant="primary"
        loading={busy}
        onPress={() =>
          void act(async () => {
            await joinGroup(group.id);
            return `You're a regular of ${group.name}. ${reminderNote(await allowReminders())}`.trim();
          }, `You're a regular of ${group.name}.`)
        }
      />
      <Text variant="meta" color="textMeta" center>
        {"You'll get a reminder 15 minutes before."}
      </Text>
    </>
  );

  return (
    <DoorLayout
      title={group.name}
      line={about}
      header={group.private ? <Chip Icon={Lock} label="Invite only" fg={colors.textSoft} bg={colors.raised} /> : undefined}
      onBack={onBack}
      backLabel={backLabel}
      footer={footer}
    >
      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <CalendarClock size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          <Text variant="heading" style={{ flex: 1 }}>
            {weeklyWords(group.days, group.time)}
          </Text>
        </View>
        {next ? (
          <Text variant="meta" color="textSoft">
            {`Next: ${dayAndTime(next.startsAt)}, ${inWords(next.startsAt).toLowerCase()}`}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: space[2] }}>
        <Text variant="body">{group.mine ? 'Hosted by you' : `Hosted by ${group.hostNickname ?? 'someone who left Circles'}`}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Users size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          <Text variant="body" color="textSoft" style={{ flex: 1 }}>
            {regulars}
          </Text>
        </View>
        <Text variant="meta" color="textMeta">
          Only the number of regulars is shown, never who.
        </Text>
      </View>

      {meetings.length > 0 ? (
        <View style={{ gap: space[1] }}>
          <Text variant="heading" accessibilityRole="header">
            Next dates
          </Text>
          {meetings.slice(0, 3).map((m, i) => (
            <View
              key={m.id}
              style={{
                minHeight: size.minTarget,
                justifyContent: 'center',
                borderTopWidth: i === 0 ? 0 : border.hairline,
                borderTopColor: colors.divider,
              }}
            >
              <Text variant="body">{dayAndTime(m.startsAt)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text variant="meta" color="textMeta">
        Be kind. Let everyone have a turn. Room rules apply in every meeting.
      </Text>

      {error ? <ErrorLine message={error} /> : null}

      {joined ? <Button label="Invite your people" onPress={() => setInviteOpen(true)} /> : null}

      {group.mine ? (
        <Button
          label="End this group"
          variant="quiet"
          disabled={busy}
          onPress={() =>
            Alert.alert('End this group?', "Its meetings stop and it leaves Explore. This can't be undone.", [
              { text: 'Keep it', style: 'cancel' },
              { text: 'End it', style: 'destructive', onPress: () => void act(() => endGroup(group.id), 'The group has ended.') },
            ])
          }
        />
      ) : group.regular ? (
        <Button
          label="Leave group"
          variant="quiet"
          disabled={busy}
          onPress={() => void act(() => leaveGroup(group.id), `You left ${group.name}.`)}
        />
      ) : null}

      <Toast message={toast} onDone={() => setToast(null)} />
      <InviteSheet
        visible={inviteOpen}
        target={{ groupId: group.id }}
        title={group.name}
        onClose={() => setInviteOpen(false)}
        onSent={(note) => {
          setInviteOpen(false);
          setToast(note);
        }}
      />
    </DoorLayout>
  );
}
