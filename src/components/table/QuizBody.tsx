import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { TableItem, TableState } from '../../table/model';
import { radius, size, space, useColors } from '../../theme';
import { RadioRow } from '../Choice';
import { TableAction } from '../TableAction';
import { Text } from '../Text';

type Props = {
  item: Extract<TableItem, { kind: 'quiz' }>;
  state: TableState;
  mine: boolean;
  myAnswer: number | null;
  answeredCount: number;
  peopleCount: number;
  onAnswer: (choice: number) => void;
  onReveal: () => void;
};

const LETTERS = ['A', 'B', 'C', 'D'];

// Quiz: question, 2 to 4 answers; everyone answers privately; the presenter reveals how many chose
// each. No running scoreboard, never who chose what (activities.md › Quiz).
export function QuizBody({ item, state, mine, myAnswer, answeredCount, peopleCount, onAnswer, onReveal }: Props) {
  const colors = useColors();
  const counts = state.revealed ? state.counts ?? [] : null;
  const total = counts ? counts.reduce((a, b) => a + b, 0) : 0;

  return (
    <View style={{ gap: space[4] }}>
      <Text variant="heading">{item.question}</Text>
      {counts ? (
        <View style={{ gap: space[3] }} accessibilityLiveRegion="polite">
          {item.answers.map((a, i) => {
            const n = counts[i] ?? 0;
            const right = item.correct === i;
            return (
              <View key={i} accessible accessibilityLabel={`${LETTERS[i]}, ${a}: ${n} ${n === 1 ? 'person' : 'people'}${right ? '. The right answer' : ''}${myAnswer === i ? '. Your answer' : ''}`} style={{ gap: space[1] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  {right ? <Check size={size.iconMeta} color={colors.live} strokeWidth={size.iconStroke} /> : null}
                  <Text variant="bodyStrong" style={{ flex: 1 }}>{`${LETTERS[i]}. ${a}`}</Text>
                  <Text variant="metaStrong" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>
                    {String(n)}
                  </Text>
                </View>
                <View style={{ height: space[2], borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden' }}>
                  <View style={{ width: `${total ? (n / total) * 100 : 0}%`, height: '100%', backgroundColor: right ? colors.live : colors.textSoft }} />
                </View>
                {myAnswer === i ? (
                  <Text variant="tiny" color="textMeta">
                    Your answer
                  </Text>
                ) : null}
              </View>
            );
          })}
          <Text variant="meta" color="textMeta">
            {item.correct === null ? 'A poll: no right answer.' : 'Nothing is kept: no points, no rankings.'}
          </Text>
        </View>
      ) : (
        <>
          <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
            {item.answers.map((a, i) => (
              <RadioRow key={i} title={`${LETTERS[i]}. ${a}`} selected={myAnswer === i} onPress={() => onAnswer(i)} />
            ))}
          </View>
          {mine ? (
            <>
              <Text variant="meta" color="textSoft" center style={{ fontVariant: ['tabular-nums'] }}>
                {`${answeredCount} of ${peopleCount} answered`}
              </Text>
              <TableAction label="Reveal the answers" onPress={onReveal} />
            </>
          ) : (
            <Text variant="meta" color="textMeta" center>
              {myAnswer === null
                ? 'Tap an answer. Only how many chose each is shown, never who.'
                : `You chose ${LETTERS[myAnswer]}. You can change it until ${item.byName} reveals.`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
