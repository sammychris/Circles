import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bell, ChevronRight, HeartHandshake, Mail, Users } from 'lucide-react-native';
import { DoorLayout } from '../components/DoorLayout';
import { ShowSome } from '../components/ShowSome';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { loadActivity, markActivitySeen, type Activity } from '../lib/activity';
import { dayAndTime } from '../lib/when';
import { useSchedule } from '../rooms/useSchedule';
import { opacity, size, space, useColors } from '../theme';

type Icon = typeof Bell;

function Item({ Icon, title, line, onPress }: { Icon: Icon; title: string; line: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.buttonPrimary, opacity: pressed ? opacity.pressed : 1 })}
    >
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="meta" color="textSoft" numberOfLines={1}>
          {line}
        </Text>
      </View>
      <ChevronRight size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
    </Pressable>
  );
}

// Activity (the bell on Home): what's new for you. Invitations and new friends open People, requests
// open Hosting, reminders show what's coming up.
export function ActivityScreen({
  me,
  onBack,
  onPeople,
  onFriends,
  onHosting,
}: {
  me: { id: string };
  onBack: () => void;
  onPeople: () => void;
  onFriends: () => void;
  onHosting: () => void;
}) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [failed, setFailed] = useState(false);
  const schedule = useSchedule(me.id);
  const now = Date.now();
  // Reminders you set, and your groups' meetings, in the next day.
  const soon = (schedule.rooms ?? []).filter(
    (r) => (r.reminded || r.regular) && r.startsAt.getTime() > now - 60 * 60_000 && r.startsAt.getTime() < now + 24 * 60 * 60_000,
  );

  const load = useCallback(async () => {
    try {
      const a = await loadActivity();
      setActivity(a);
      setFailed(false);
      await markActivitySeen(me.id, a);
    } catch {
      setFailed(true);
    }
  }, [me.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const empty = activity && activity.invitations.length + activity.requests.length + activity.friends.length + soon.length === 0;

  return (
    <DoorLayout title="Activity" onBack={onBack}>
      {failed && !activity ? (
        <View style={{ gap: space[2] }}>
          <Text variant="body" color="textSoft">
            {"Couldn't load. Check that you're online."}
          </Text>
          <Button label="Try again" variant="quiet" onPress={() => void load()} />
        </View>
      ) : !activity ? (
        <Text variant="meta" color="textMeta">
          Loading…
        </Text>
      ) : empty ? (
        <View style={{ gap: space[2] }}>
          <Text variant="heading">Nothing new</Text>
          <Text variant="body" color="textSoft">
            Invitations, reminders and new friends show up here.
          </Text>
        </View>
      ) : (
        <>
          {activity.requests.length > 0 ? (
            <View>
              <ShowSome
                items={activity.requests}
                noun="requests"
                render={(r) => (
                  <Item key={r.id} Icon={HeartHandshake} title={`${r.nickname} asked you for a one-on-one`} line="Answer in Hosting. Requests run out after 10 minutes." onPress={onHosting} />
                )}
              />
            </View>
          ) : null}
          {activity.invitations.length > 0 ? (
            <View>
              <ShowSome
                items={activity.invitations}
                noun="invitations"
                render={(i) => (
                  <Item
                    key={i.id}
                    Icon={Mail}
                    title={`${i.fromNickname} invited you to ${i.title}`}
                    line={i.kind === 'room' ? 'Going on now. Join in People.' : i.startsAt ? dayAndTime(i.startsAt) : 'A weekly group'}
                    onPress={onPeople}
                  />
                )}
              />
            </View>
          ) : null}
          {soon.length > 0 ? (
            <View>
              <ShowSome
                items={soon}
                noun="reminders"
                render={(r) => <Item key={r.id} Icon={Bell} title={r.title} line={`Coming up ${dayAndTime(r.startsAt)}`} onPress={onPeople} />}
              />
            </View>
          ) : null}
          {activity.friends.length > 0 ? (
            <View>
              <ShowSome
                items={activity.friends}
                noun="new friends"
                render={(f) => (
                  <Item key={f.personId} Icon={Users} title={`You and ${f.nickname} are now friends`} line="Only the two of you see it" onPress={onFriends} />
                )}
              />
            </View>
          ) : null}
        </>
      )}
    </DoorLayout>
  );
}
