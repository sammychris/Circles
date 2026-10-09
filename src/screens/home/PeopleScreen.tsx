import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { WEB_URL } from '../../config';
import type { RoomRequest } from '../../rooms/api';
import { Lock } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import { myConnections, type PersonRef } from '../../lib/people';
import { size, space, useColors } from '../../theme';

// "My people": the people you saved who saved you too. Only the two of you ever see a connection.
type Props = { nickname: string; onBack: () => void; onEnter: (r: RoomRequest) => void };

// "Start a room with friends" opens an invite-only room and the share menu (doors.md › My people).
export function PeopleScreen({ nickname, onBack, onEnter }: Props) {
  const colors = useColors();
  const [people, setPeople] = useState<PersonRef[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void myConnections()
      .then(setPeople)
      .catch(() => setFailed(true));
  }, []);

  return (
    <DoorLayout
      title="My people"
      line="People you saved who saved you too."
      onBack={onBack}
      footer={
        <>
          <Button
            label="Start a room with friends"
            variant="primary"
            // With nobody to invite (and no link to share), the room would stay empty.
            disabled={people?.length === 0 && !WEB_URL}
            onPress={() =>
              onEnter({ kind: 'create', door: 'talk', title: `${nickname} and friends`, topic: null, capacity: 6, private: true })
            }
          />
          <Text variant="meta" color="textMeta" center>
            {people?.length === 0 && !WEB_URL
              ? 'Save people after a room to invite them.'
              : 'Only people you invite can join. It opens now, with you in it.'}
          </Text>
        </>
      }
    >
      {failed ? (
        <Text variant="body" color="textSoft">
          We couldn't load your people. Check that you're online.
        </Text>
      ) : people === null ? null : people.length === 0 ? (
        <Text variant="body" color="textSoft">
          Nobody yet. After a room, save the people you clicked with. If they save you too, they'll show up here.
        </Text>
      ) : (
        <View style={{ gap: space[3] }}>
          {people.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
              <Text variant="bodyStrong">{p.nickname}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Lock size={size.icon} color={colors.textMeta} strokeWidth={size.iconStroke} />
        <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
          Friends never see when you're in a support room.
        </Text>
      </View>
    </DoorLayout>
  );
}
