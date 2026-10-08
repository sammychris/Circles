import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { EMAIL_ENABLED } from '../../config';
import { myThanksCount } from '../../lib/people';
import { listBlocked, unblockPerson, type Blocked } from '../../lib/safety';
import { border, size, space, useColors } from '../../theme';

type Props = {
  me: { id: string; nickname: string };
  hasEmail: boolean;
  onBack: () => void;
  onAddEmail: () => void;
  onLogOut: () => void;
};

export function MeScreen({ me, hasEmail, onBack, onAddEmail, onLogOut }: Props) {
  const colors = useColors();
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [thanks, setThanks] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBlocked(await listBlocked());
    } catch {
      setBlocked([]);
    }
    try {
      setThanks(await myThanksCount());
    } catch {
      setThanks(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(person: Blocked) {
    try {
      await unblockPerson(me.id, person.id);
      setBlocked((list) => (list ?? []).filter((b) => b.id !== person.id));
      setToast(`${person.nickname} is unblocked.`);
    } catch {
      setToast("That didn't work. Check your connection.");
    }
  }

  return (
    <DoorLayout
      title={me.nickname}
      onBack={onBack}
      header={<Avatar userId={me.id} nickname={me.nickname} diameter={size.avatarRoom} />}
      footer={
        <>
          <Toast message={toast} onDone={() => setToast(null)} />
          {EMAIL_ENABLED && !hasEmail ? <Button label="Add your email" variant="quiet" onPress={onAddEmail} /> : null}
          <Button label="Log out" variant="quiet" onPress={onLogOut} />
        </>
      }
    >
      <Text variant="body" color="textSoft">
        Your nickname is the only thing people in Circles see about you.
      </Text>

      {thanks !== null && thanks > 0 ? (
        <Text variant="bodyStrong" color="emberText">
          {thanks === 1 ? 'Someone thanked you after a room.' : `People thanked you ${thanks} times after rooms.`}
        </Text>
      ) : null}

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Blocked people</Text>
        {blocked === null ? null : blocked.length === 0 ? (
          <Text variant="body" color="textSoft">
            You haven't blocked anyone.
          </Text>
        ) : (
          blocked.map((person, i) => (
            <View
              key={person.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[3],
                paddingVertical: space[3],
                borderTopWidth: i === 0 ? 0 : border.hairline,
                borderTopColor: colors.divider,
              }}
            >
              <Avatar userId={person.id} nickname={person.nickname} diameter={size.avatarList} />
              <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {person.nickname}
              </Text>
              <Button label="Unblock" onPress={() => void unblock(person)} style={{ width: size.rowAction }} />
            </View>
          ))
        )}
      </View>
    </DoorLayout>
  );
}
