import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Check, Share2 } from 'lucide-react-native';
import { myConnections, type PersonRef } from '../lib/people';
import { sendInvitations, TooManyRoomsError, type InviteTarget } from '../rooms/api';
import { border, opacity, radius, size, space, useColors } from '../theme';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { ErrorLine } from './ErrorLine';
import { Sheet } from './Sheet';
import { Text } from './Text';

type Props = {
  visible: boolean;
  // What they're invited to, and its name for the title ("Invite to Ludo night").
  target: InviteTarget | null;
  title: string;
  onClose: () => void;
  // After sending: the page shows a short note.
  onSent: (note: string) => void;
  // Share a link too, when the web version is online (rooms only).
  onShareLink?: () => void;
};

// Invite your people (doors.md › My people, tabs.md › Invitations): only people who saved each other
// with you are listed. They find the invitation in Groups. Never offered in support rooms.
export function InviteSheet({ visible, target, title, onClose, onSent, onShareLink }: Props) {
  const colors = useColors();
  const [people, setPeople] = useState<PersonRef[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setChosen([]);
    setError(null);
    setFailed(false);
    myConnections()
      .then(setPeople)
      .catch(() => setFailed(true));
  }, [visible]);

  const send = async () => {
    if (!target || chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await sendInvitations(chosen, target);
      onSent(chosen.length === 1 ? 'Invitation sent. They’ll find it in Groups.' : 'Invitations sent. They’ll find them in Groups.');
    } catch (e) {
      setError(
        e instanceof TooManyRoomsError ? 'That’s a lot of invitations. Try again later.' : "That didn't work. Check that you're online.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} dismissable={!busy}>
      <Text variant="title" numberOfLines={2}>{`Invite to ${title}`}</Text>
      <Text variant="body" color="textSoft">
        People you saved who saved you too. Nobody else sees who you invited.
      </Text>
      {failed ? (
        <Text variant="body" color="textSoft">
          {"We couldn't load your people. Check that you're online."}
        </Text>
      ) : people === null ? null : people.length === 0 ? (
        <Text variant="body" color="textSoft">
          {'Nobody yet. After a room, save the people you clicked with. If they save you too, you can invite them.'}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: size.sheetList }}>
          {people.map((p) => {
            const on = chosen.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={p.nickname}
                onPress={() => setChosen(on ? chosen.filter((x) => x !== p.id) : [...chosen, p.id])}
                style={({ pressed }) => ({
                  minHeight: size.minTarget + space[3],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[3],
                  opacity: pressed ? opacity.pressed : 1,
                })}
              >
                <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {p.nickname}
                </Text>
                <View
                  style={{
                    width: size.icon,
                    height: size.icon,
                    borderRadius: radius.small / 2,
                    borderWidth: border.selected,
                    borderColor: on ? colors.text : colors.line,
                    backgroundColor: on ? colors.text : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {on ? <Check size={size.iconMeta} color={colors.bg} strokeWidth={size.iconStroke} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {error ? <ErrorLine message={error} /> : null}
      <View style={{ gap: space[3] }}>
        {people && people.length > 0 ? (
          <Button
            label={chosen.length > 1 ? `Invite ${chosen.length} people` : 'Invite'}
            variant="primary"
            disabled={chosen.length === 0}
            loading={busy}
            onPress={() => void send()}
          />
        ) : null}
        {onShareLink ? (
          <Pressable
            accessibilityRole="button"
            onPress={onShareLink}
            style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] }}
          >
            <Share2 size={size.iconMeta} color={colors.textSoft} strokeWidth={size.iconStroke} />
            <Text variant="bodyStrong" color="textSoft">
              Share a link instead
            </Text>
          </Pressable>
        ) : null}
        <Button label="Close" variant="quiet" disabled={busy} onPress={onClose} />
      </View>
    </Sheet>
  );
}
