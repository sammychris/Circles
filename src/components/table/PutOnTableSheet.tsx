import type { ComponentType } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Dice5, FileText, Images, MonitorPlay, MonitorUp, Search } from 'lucide-react-native';
import type { Door, TableKind } from '../../table/model';
import { allowedKinds } from '../../table/model';
import { doorColors, moodColors, opacity, radius, size, space, useColors } from '../../theme';
import { Sheet } from '../Sheet';
import { Text } from '../Text';

export type TableChoice = TableKind | 'ludo' | 'impostor';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;

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
  // Games are only offered in play rooms, once three people are here.
  gamesReady: boolean;
  onClose: () => void;
  onPick: (choice: TableChoice) => void;
};

// "Put on the table" (docs/screens/18-put-on-the-table.png, activities.md). Only what this room allows.
export function PutOnTableSheet({ visible, door, gamesReady, onClose, onPick }: Props) {
  const allowed = allowedKinds(door);
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
          <Row Icon={Images} title="Photos" line="Show them one by one. Blurred until each person taps" onPress={() => onPick('photos')} />
        ) : null}
        {share && allowed.includes('screen') && canShareScreen() ? (
          <Row Icon={MonitorUp} title="Share my screen" line="Show and explain something on your phone" onPress={() => onPick('screen')} />
        ) : null}
      </View>

      {allowed.includes('video') ? (
        <View style={{ gap: space[2] }}>
          <Text variant="metaStrong" color="textMeta">
            Do together
          </Text>
          <Row Icon={MonitorPlay} title="Watch together" line="A YouTube or Vimeo video, the same moment for everyone" onPress={() => onPick('video')} />
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
            line={gamesReady ? "3 to 6 people. One of you doesn't know the word" : 'Starts once three people are here'}
            disabled={!gamesReady}
            onPress={() => onPick('impostor')}
          />
          <Row
            Icon={Dice5}
            tint={doorColors.people}
            title="Ludo"
            line={gamesReady ? 'Two teams' : 'Starts once three people are here'}
            disabled={!gamesReady}
            onPress={() => onPick('ludo')}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
