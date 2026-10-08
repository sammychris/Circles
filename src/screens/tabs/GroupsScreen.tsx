import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarClock, Lock } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { WEB_URL } from '../../config';
import { myConnections, type PersonRef } from '../../lib/people';
import { useScreenEdges, useTabScroll } from '../../navigation/TabBar';
import type { RoomRequest } from '../../rooms/api';
import { radius, size, space, useColors } from '../../theme';

// How many faces show in the My people row before "and 4 more".
const FACES = 6;

// Groups: what's yours (docs/design/pages/tabs.md › Groups). For now My people; Next up, invitations,
// your groups and reminders arrive with scheduled and weekly rooms.
export function GroupsScreen({
  nickname,
  onEnter,
  onExplore,
  onOpenPeople,
}: {
  nickname: string;
  onEnter: (r: RoomRequest) => void;
  onExplore: () => void;
  // The full My people list.
  onOpenPeople: () => void;
}) {
  const colors = useColors();
  const edges = useScreenEdges();
  const scroll = useTabScroll('groups');
  const [people, setPeople] = useState<PersonRef[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <Text variant="title" accessibilityRole="header">
          Groups
        </Text>

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

        <View style={{ gap: space[3] }}>
          <Text variant="heading" accessibilityRole="header">
            Your groups and reminders
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <CalendarClock size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
            <Text variant="body" color="textSoft" style={{ flex: 1 }}>
              {"Weekly groups and reminders will show here. They're coming next."}
            </Text>
          </View>
          <Button label="Explore rooms" variant="quiet" onPress={onExplore} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
