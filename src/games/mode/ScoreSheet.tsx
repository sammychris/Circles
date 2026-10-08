import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { RadioRow } from '../../components/Choice';
import { Sheet } from '../../components/Sheet';
import { Text } from '../../components/Text';
import { space } from '../../theme';
import { TARGETS, type ScoreGame } from '../score';
import { GAME_TITLE } from './howToPlay';

// Before a game with a score starts: just keep count, or play to a target ("First to 3 wins").
// The score is only for this sitting (src/games/score.ts).
export function ScoreSheet({
  game,
  onClose,
  onStart,
}: {
  game: ScoreGame | null;
  onClose: () => void;
  onStart: (target: number | null) => void;
}) {
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => {
    if (game) setTarget(null);
  }, [game]);
  const byPerson = game === 'whot';
  return (
    <Sheet visible={!!game} onClose={onClose}>
      <View style={{ gap: space[2] }}>
        <Text variant="title" accessibilityRole="header">
          How do you want to keep score?
        </Text>
        <Text variant="body" color="textSoft">
          {byPerson ? 'Each win counts for the person who wins.' : 'Each win counts for the team. Play again keeps the same teams.'}
        </Text>
      </View>
      <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
        <RadioRow
          title="Just keep count"
          line="Every win adds up while you keep playing"
          selected={target === null}
          onPress={() => setTarget(null)}
        />
        {TARGETS.map((n) => (
          <RadioRow
            key={n}
            title={`First to ${n} wins`}
            line="Then you can start another set"
            selected={target === n}
            onPress={() => setTarget(n)}
          />
        ))}
      </View>
      <Text variant="meta" color="textMeta">
        {"Scores are just for this room: they're gone when it ends."}
      </Text>
      <Button label={game ? `Start ${GAME_TITLE[game]}` : 'Start'} onPress={() => onStart(target)} />
    </Sheet>
  );
}
