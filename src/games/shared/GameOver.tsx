import { Pressable, View } from 'react-native';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { size, space } from '../../theme';

type Props = {
  result: string;
  canRestart: boolean;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
  // The score for this sitting, if the game keeps one ("Team Sun 2, Team Sky 1"), and whether someone
  // has just won the set.
  score?: { line: string; setWon: boolean };
  // Mix the teams again (or, in Whot, start the score again): the score starts over.
  fresh?: { label: string; onPress: () => void };
};

// "Good game." This game's result, and the score while you keep playing. Nothing is kept after the
// room ends (play.md › Game over; CLAUDE.md: no scores after a room ends).
export function GameOver({ result, canRestart, onPlayAgain, onBackToTalking, score, fresh }: Props) {
  return (
    <View style={{ gap: space[2] }} accessibilityLiveRegion="polite">
      <Text variant="heading" center>
        {result}
      </Text>
      {score ? (
        <Text variant="bodyStrong" color="textSoft" center>
          {score.line}
        </Text>
      ) : null}
      <Text variant="meta" color="textMeta" center>
        {score
          ? "Good game. Scores are just for this room: they're gone when it ends."
          : 'Good game. Nothing is kept: no points, no rankings.'}
      </Text>
      {canRestart ? <TableAction label={score?.setWon ? 'Play another set' : 'Play again'} onPress={onPlayAgain} /> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space[5] }}>
        {canRestart && fresh ? (
          <Pressable
            accessibilityRole="button"
            onPress={fresh.onPress}
            style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="bodyStrong" color="textSoft">
              {fresh.label}
            </Text>
          </Pressable>
        ) : null}
        {/* Everyone can close it: for the starter it comes off the table, for others just on their phone. */}
        <Pressable
          accessibilityRole="button"
          onPress={onBackToTalking}
          style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="bodyStrong" color="textSoft">
            Back to the room
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
