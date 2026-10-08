import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { CircleHelp, Crown, Dice5, FileText, Grid3x3, Images, Languages, ListOrdered, MonitorPlay, MonitorUp, Search, Spade, VenetianMask } from 'lucide-react-native';
import type { Door, TableKind } from '../../table/model';
import { GAMES } from '../../games/registry';
import { MIN_PLAYERS as IMPOSTOR_MIN } from '../../games/impostor/logic';
import { MIN_PLAYERS as LUDO_MIN } from '../../games/ludo/engine';
import type { GameId } from '../../games/tableGame';
import { allowedKinds } from '../../table/model';
import { doorColors, moodColors, opacity, radius, size, space, useColors } from '../../theme';
import { Sheet } from '../Sheet';
import { Text } from '../Text';

export type TableChoice = TableKind | 'ludo' | 'impostor' | GameId;

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

const GAME_ICON: Record<GameId, Icon> = { draughts: Grid3x3, chess: Crown, whot: Spade, mafia: VenetianMask };
const GAME_TINT: Record<GameId, { fg: string; bg: string }> = {
  draughts: moodColors.down,
  chess: moodColors.advice,
  whot: moodColors.bored,
  mafia: doorColors.people,
};

function Row({
  Icon,
  tint,
  title,
  line,
  disabled,
  onPress,
}: {
  Icon: Icon;
  tint?: { fg: string; bg: string };
  title: string;
  line: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const fg = tint?.fg ?? colors.textSoft;
  const bg = tint?.bg ?? colors.raised;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.avatarRoom,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
      })}
    >
      <View
        style={{ width: size.minTarget, height: size.minTarget, borderRadius: radius.small, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={size.icon} color={fg} strokeWidth={size.iconStroke} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="meta" color="textSoft">
          {line}
        </Text>
      </View>
    </Pressable>
  );
}

// Phones can share their screen in the app; in a browser, only computers can.
export function canShareScreen(): boolean {
  if (Platform.OS === 'android') return true;
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return !mobile && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;
}

type Props = {
  visible: boolean;
  door: Door;
  // Games are only offered in play rooms, once the game channels have settled.
  gamesReady: boolean;
  // Each game has its own minimum (Find the Impostor 3, Mafia 5), so a room of 2 can't start every game.
  peopleCount: number;
  onClose: () => void;
  onPick: (choice: TableChoice) => void;
};

// "Put on the table" (docs/screens/18-put-on-the-table.png, activities.md). Only what this room allows.
export function PutOnTableSheet({ visible, door, gamesReady, peopleCount, onClose, onPick }: Props) {
  const allowed = allowedKinds(door);
  // What a game row says, and whether it can be picked yet.
  const gameRow = (min: number, line: string, tooFew = `Needs at least ${min} people`) =>
    !gamesReady
      ? { line: 'Getting the game ready', disabled: true }
      : peopleCount < min
        ? { line: tooFew, disabled: true }
        : { line, disabled: false };
  const impostorRow = gameRow(IMPOSTOR_MIN, "3 to 6 people. One of you doesn't know the word");
  const ludoRow = gameRow(LUDO_MIN, 'Two teams');
  const share = allowed.includes('photos') || allowed.includes('screen');
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space[2] }}>
        <Text variant="title" accessibilityRole="header">
          Put on the table
        </Text>
        <Text variant="body" color="textSoft">
          Everyone sees it while you talk. You only see what this room allows.
        </Text>
      </View>

      <View style={{ gap: space[2] }}>
        <Text variant="metaStrong" color="textMeta">
          Share
        </Text>
        <Row Icon={FileText} title="A note or link" line="Something to discuss or get help with" onPress={() => onPick('note')} />
        {share && allowed.includes('photos') ? (
          <Row Icon={Images} title="Photos" line="Show them one by one. Hidden until each person taps" onPress={() => onPick('photos')} />
        ) : null}
        {share && allowed.includes('screen') && canShareScreen() ? (
          <Row Icon={MonitorUp} title="Share my screen" line="Show and explain something on your phone" onPress={() => onPick('screen')} />
        ) : null}
      </View>

      {allowed.includes('turns') || allowed.includes('video') ? (
        <View style={{ gap: space[2] }}>
          <Text variant="metaStrong" color="textMeta">
            Do together
          </Text>
          {allowed.includes('words') ? (
            <Row Icon={Languages} title="Words" line="Up to 10 words with meanings, shown one at a time" onPress={() => onPick('words')} />
          ) : null}
          {allowed.includes('turns') ? (
            <Row Icon={ListOrdered} title="Take turns" line="A speaking order for stories and debates" onPress={() => onPick('turns')} />
          ) : null}
          {allowed.includes('quiz') ? (
            <Row Icon={CircleHelp} title="Quiz" line="You ask, everyone answers on their phone" onPress={() => onPick('quiz')} />
          ) : null}
          {allowed.includes('video') ? (
            <Row Icon={MonitorPlay} title="Watch together" line="A YouTube or Vimeo video, the same moment for everyone" onPress={() => onPick('video')} />
          ) : null}
        </View>
      ) : null}

      {door === 'play' ? (
        <View style={{ gap: space[2] }}>
          <Text variant="metaStrong" color="textMeta">
            Games
          </Text>
          <Row
            Icon={Search}
            tint={moodColors.laugh}
            title="Find the Impostor"
            line={impostorRow.line}
            disabled={impostorRow.disabled}
            onPress={() => onPick('impostor')}
          />
          <Row
            Icon={Dice5}
            tint={doorColors.people}
            title="Ludo"
            line={ludoRow.line}
            disabled={ludoRow.disabled}
            onPress={() => onPick('ludo')}
          />
          {(Object.keys(GAMES) as GameId[]).map((id) => {
            const game = GAMES[id]!;
            const Icon = GAME_ICON[id];
            const row = gameRow(game.min, game.line, id === 'mafia' ? 'Needs at least 5 people: a narrator and 4 players' : undefined);
            return (
              <Row
                key={id}
                Icon={Icon}
                tint={GAME_TINT[id]}
                title={game.name}
                line={row.line}
                disabled={row.disabled}
                onPress={() => onPick(id)}
              />
            );
          })}
        </View>
      ) : null}
    </Sheet>
  );
}
