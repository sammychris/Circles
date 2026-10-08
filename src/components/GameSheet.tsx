import { Pressable, View } from 'react-native';
import { ChevronRight, Dice5, Search } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { doorColors, moodColors, radius, size, space, useColors } from '../theme';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type GameChoice = 'ludo' | 'impostor';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

function GameRow({ Icon, tint, title, line, onPress }: { Icon: Icon; tint: { fg: string; bg: string }; title: string; line: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      style={{ minHeight: size.avatarRoom, flexDirection: 'row', alignItems: 'center', gap: space[4] }}
    >
      <View
        style={{ width: size.tileIconBox, height: size.tileIconBox, borderRadius: radius.small, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={size.iconButton20} color={tint.fg} strokeWidth={size.iconStroke} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="meta" color="textSoft">
          {line}
        </Text>
      </View>
      <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
    </Pressable>
  );
}

// Pick a game to put on the table. Only games that exist are shown.
export function GameSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (g: GameChoice) => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title">Play a game</Text>
      <Text variant="body" color="textSoft">
        The game goes on the table. Everyone keeps talking.
      </Text>
      <View style={{ gap: space[3] }}>
        <GameRow Icon={Search} tint={moodColors.laugh} title="Find the Impostor" line="3 to 6 people. One of you doesn't know the word." onPress={() => onPick('impostor')} />
        <GameRow Icon={Dice5} tint={doorColors.people} title="Ludo" line="In two teams" onPress={() => onPick('ludo')} />
      </View>
    </Sheet>
  );
}
