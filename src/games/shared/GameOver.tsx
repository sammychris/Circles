import { Pressable, View } from 'react-native';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { size, space } from '../../theme';

// "Good game." Only this game's result; nothing is kept (play.md › Game over).
export function GameOver({ result, canRestart, onPlayAgain, onBackToTalking }: { result: string; canRestart: boolean; onPlayAgain: () => void; onBackToTalking: () => void }) {
  return (
    <View style={{ gap: space[3] }} accessibilityLiveRegion="polite">
      <Text variant="heading" center>
        {result}
      </Text>
      <Text variant="meta" color="textMeta" center>
        Good game. Nothing is kept: no points, no rankings.
      </Text>
      {canRestart ? (
        <>
          <TableAction label="Play again" onPress={onPlayAgain} />
          <Pressable accessibilityRole="button" onPress={onBackToTalking} style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="bodyStrong" color="textSoft">
              Back to talking
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
