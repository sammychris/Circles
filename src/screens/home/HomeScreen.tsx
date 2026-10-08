import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, ChevronRight, Dice5, Heart, MessageCircle, Users } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { Glow } from '../../components/Glow';
import { Text } from '../../components/Text';
import { greeting, peopleInRooms, timeWord } from '../../lib/timeOfDay';
import { roomStats } from '../../rooms/api';
import { doorColors, opacity, radius, size, space, useColors } from '../../theme';

export type DoorName = 'support' | 'play' | 'talk' | 'learn' | 'people';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

function DoorTile({
  Icon,
  title,
  line,
  tint,
  onPress,
}: {
  Icon: Icon;
  title: string;
  line: string;
  tint: { fg: string; bg: string };
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: size.doorTile,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: space[4],
        justifyContent: 'space-between',
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <View
        style={{
          width: size.tileIconBox,
          height: size.tileIconBox,
          borderRadius: radius.small,
          backgroundColor: tint.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={size.iconButton20} color={tint.fg} strokeWidth={size.iconStroke} />
      </View>
      <View style={{ gap: space[1] }}>
        <Text variant="heading">{title}</Text>
        <Text variant="meta" color="textSoft" numberOfLines={1}>
          {line}
        </Text>
      </View>
    </Pressable>
  );
}

type Props = { me: { id: string; nickname: string }; onOpen: (door: DoorName) => void; onOpenMe: () => void };

// One house, many doors (docs/screens/01-home.png). No ember on Home: each door page has its own.
export function HomeScreen({ me, onOpen, onOpenMe }: Props) {
  const colors = useColors();
  const [people, setPeople] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setPeople((await roomStats()).people);
    } catch {
      setPeople(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
          <Text variant="bodyStrong" color="textSoft" style={{ flex: 1 }} numberOfLines={1}>
            {`${greeting()}, ${me.nickname}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Me"
            onPress={onOpenMe}
            style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
          >
            <Avatar userId={me.id} nickname={me.nickname} diameter={size.avatarList} />
          </Pressable>
        </View>

        <View style={{ gap: space[3] }}>
          <Text variant="display" accessibilityRole="header">
            {`What brings you in ${timeWord()}?`}
          </Text>
          {people !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <View style={{ width: space[2], height: space[2], borderRadius: radius.pill, backgroundColor: colors.live }} />
              <Text variant="meta" color="textSoft">
                {peopleInRooms(people)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: space[3] }}>
          {/* The support line: always first under the question, never moved, hidden or shrunk. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Need someone to talk to? Come in. It's quiet and kind."
            onPress={() => onOpen('support')}
            style={({ pressed }) => ({
              minHeight: size.supportLine,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              paddingHorizontal: space[4],
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[4],
              overflow: 'hidden',
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            <Glow diameter={size.supportLine * 4} centerX={space[4] + size.iconButton / 2} centerY={size.supportLine / 2} />
            <View
              style={{
                width: size.iconButton,
                height: size.iconButton,
                borderRadius: radius.pill,
                backgroundColor: colors.emberSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={size.iconButton20} color={colors.emberText} fill={colors.emberText} strokeWidth={size.iconStroke} />
            </View>
            <View style={{ flex: 1, gap: space[1] }}>
              <Text variant="bodyStrong">Need someone to talk to?</Text>
              <Text variant="meta" color="textSoft">
                Come in. It's quiet and kind.
              </Text>
            </View>
            <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          </Pressable>

          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <DoorTile Icon={Dice5} title="I'm bored" line="Play while you talk" tint={doorColors.play} onPress={() => onOpen('play')} />
            <DoorTile
              Icon={MessageCircle}
              title="I want to talk"
              line="Topics and moods"
              tint={doorColors.talk}
              onPress={() => onOpen('talk')}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <DoorTile
              Icon={BookOpen}
              title="Learn together"
              line="Languages, skills"
              tint={doorColors.learn}
              onPress={() => onOpen('learn')}
            />
            <DoorTile Icon={Users} title="My people" line="Friends and groups" tint={doorColors.people} onPress={() => onOpen('people')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
