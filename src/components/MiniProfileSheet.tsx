import { View } from 'react-native';
import { Ban, Bookmark, Check, Flag } from 'lucide-react-native';
import { border, size, space, useColors } from '../theme';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type SheetPerson = { id: string; nickname: string; isHost?: boolean };

type Props = {
  person: SheetPerson | null;
  saved: boolean;
  onClose: () => void;
  onToggleSave: (person: SheetPerson) => void;
  onBlock: (person: SheetPerson) => void;
  onReport: (person: SheetPerson) => void;
};

// Tap someone in the room (docs/screens/08-mini-profile.png). Only the nickname is ever shown.
export function MiniProfileSheet({ person, saved, onClose, onToggleSave, onBlock, onReport }: Props) {
  const colors = useColors();
  if (!person) return null;
  return (
    <Sheet visible onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <Avatar userId={person.id} nickname={person.nickname} diameter={size.avatarRoom} />
        <View style={{ flex: 1, gap: space[1] }}>
          <Text variant="title" numberOfLines={1}>
            {person.nickname}
          </Text>
          {person.isHost ? (
            <Text variant="meta" color="textSoft">
              Host
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ gap: space[2] }}>
        <Button
          label={saved ? `Saved ${person.nickname}` : `Save ${person.nickname}`}
          variant={saved ? 'secondary' : 'primary'}
          icon={
            saved ? (
              <Check size={size.iconButton20} color={colors.text} strokeWidth={size.iconStroke} />
            ) : (
              <Bookmark size={size.iconButton20} color={colors.onEmber} strokeWidth={size.iconStroke} />
            )
          }
          onPress={() => onToggleSave(person)}
        />
        <Text variant="meta" color="textMeta" center>
          {`It's secret. You only connect if ${person.nickname} saves you too.`}
        </Text>
      </View>

      <View style={{ height: border.hairline, backgroundColor: colors.divider }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
        <Button
          label="Block"
          variant="quiet"
          icon={<Ban size={size.iconButton20} color={colors.textSoft} strokeWidth={size.iconStroke} />}
          onPress={() => onBlock(person)}
        />
        <Button
          label="Report"
          variant="quiet"
          icon={<Flag size={size.iconButton20} color={colors.textSoft} strokeWidth={size.iconStroke} />}
          onPress={() => onReport(person)}
        />
      </View>
    </Sheet>
  );
}
