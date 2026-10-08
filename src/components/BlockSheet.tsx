import { useState } from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { blockPerson, type Blocked } from '../lib/safety';
import { size, space, useColors } from '../theme';
import { Button } from './Button';
import { ErrorLine } from './ErrorLine';
import { Sheet } from './Sheet';
import { Text } from './Text';

const WHAT_IT_DOES = [
  "You won't be matched into the same room.",
  "You won't hear them if you're ever in the same room.",
  'Any save between you is removed. They aren\'t told.',
];

type Props = {
  me: string;
  person: Blocked | null;
  onClose: () => void;
  onBlocked: (person: Blocked) => void;
};

export function BlockSheet({ me, person, onClose, onBlocked }: Props) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!person) return null;

  async function block() {
    if (!person) return;
    setBusy(true);
    setFailed(false);
    try {
      await blockPerson(me, person);
      onBlocked(person);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible onClose={onClose} dismissable={false}>
      <Text variant="title">{`Block ${person.nickname}?`}</Text>
      <View style={{ gap: space[3] }}>
        {WHAT_IT_DOES.map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <Check size={size.iconMeta + space[1]} color={colors.textSoft} strokeWidth={size.iconStroke} />
            <Text variant="body" color="textSoft" style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>
      {failed ? <ErrorLine message="We couldn't block them. Check your connection and try again." /> : null}
      <View style={{ gap: space[3] }}>
        <Button label="Block" variant="danger" loading={busy} onPress={() => void block()} />
        <Button label="Cancel" variant="quiet" disabled={busy} onPress={onClose} />
      </View>
    </Sheet>
  );
}
