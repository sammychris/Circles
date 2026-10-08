import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { LegalModal } from '../../components/LegalModal';
import { PRIVACY, TERMS, type LegalDoc } from '../../content/legal';
import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import { Toast } from '../../components/Toast';
import { EMAIL_ENABLED } from '../../config';
import { listBlocked, unblockPerson, type Blocked } from '../../lib/safety';
import { border, size, space, useColors } from '../../theme';

type Props = {
  me: { id: string; nickname: string };
  hasEmail: boolean;
  onBack: () => void;
  onAddEmail: () => void;
  onLogOut: () => void;
  onDelete: () => void;
};

export function MeScreen({ me, hasEmail, onBack, onAddEmail, onLogOut, onDelete }: Props) {
  const colors = useColors();
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [doc, setDoc] = useState<LegalDoc | null>(null);

  const load = useCallback(async () => {
    try {
      setBlocked(await listBlocked());
      setFailed(false);
    } catch {
      setFailed(true);
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
          <LegalModal doc={doc} onClose={() => setDoc(null)} />
          {EMAIL_ENABLED && !hasEmail ? <Button label="Add your email" variant="quiet" onPress={onAddEmail} /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Button label="Privacy Policy" variant="quiet" onPress={() => setDoc(PRIVACY)} />
            <Button label="Terms" variant="quiet" onPress={() => setDoc(TERMS)} />
          </View>
          <Button label="Log out" variant="quiet" onPress={onLogOut} />
          <Button label="Delete my account" variant="quiet" onPress={onDelete} />
        </>
      }
    >
      <Text variant="body" color="textSoft">
        Your nickname is the only thing people in Circles see about you.
      </Text>

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Blocked people</Text>
        {failed ? (
          <Text variant="body" color="textSoft">
            We couldn't load this. Check that you're online.
          </Text>
        ) : blocked === null ? null : blocked.length === 0 ? (
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
