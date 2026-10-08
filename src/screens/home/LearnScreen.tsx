import { Button } from '../../components/Button';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import type { RoomRequest } from '../../rooms/api';

// Learn together isn't built yet (build plan: later). Until then, be honest and offer a talk room.
export function LearnScreen({ onBack, onEnter }: { onBack: () => void; onEnter: (r: RoomRequest) => void }) {
  return (
    <DoorLayout
      title="Learn together"
      line="Language and skills groups are coming soon."
      onBack={onBack}
      footer={<Button label="Talk now instead" variant="primary" onPress={() => onEnter({ kind: 'match', door: 'talk', mood: null })} />}
    >
      <Text variant="body" color="textSoft">
        Soon you'll be able to practise Igbo, Yoruba, Hausa and more with people at your level, by voice. Until then,
        come and chat.
      </Text>
    </DoorLayout>
  );
}
