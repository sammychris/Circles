import { View } from 'react-native';
import type { TableItem, TableState } from '../../table/model';
import { border, radius, size, space, useColors } from '../../theme';
import { TableAction } from '../TableAction';
import { Text } from '../Text';

type Props = {
  item: Extract<TableItem, { kind: 'words' }>;
  state: TableState;
  mine: boolean;
  onPresent: (change: Omit<TableState, 'seq'>) => void;
};

// Words (Learn rooms, activities.md › Words): up to 10 words with meanings; the person who put them
// there shows them one at a time, so the room can guess and say them out loud first.
export function WordsBody({ item, state, mine, onPresent }: Props) {
  const colors = useColors();
  const shown = Math.min(state.index ?? 0, item.words.length);
  return (
    <View style={{ gap: space[3] }}>
      {item.words.map((p, i) => {
        const open = i < shown;
        const latest = i === shown - 1;
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={open ? `${p.w}${p.m ? `, meaning ${p.m}` : ''}` : `Word ${i + 1}, not shown yet`}
            style={{
              minHeight: size.minTarget,
              paddingHorizontal: space[3],
              paddingVertical: space[2],
              borderRadius: radius.small,
              borderWidth: border.selected,
              borderColor: latest ? colors.text : 'transparent',
              backgroundColor: open ? colors.surface : 'transparent',
              justifyContent: 'center',
            }}
          >
            {open ? (
              <>
                <Text variant="heading">{p.w}</Text>
                {p.m ? (
                  <Text variant="body" color="textSoft">
                    {p.m}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="bodyStrong" color="textMeta">{`${i + 1}. • • •`}</Text>
            )}
          </View>
        );
      })}
      {mine ? (
        shown < item.words.length ? (
          <TableAction label={shown === 0 ? 'Show the first word' : 'Show the next word'} onPress={() => onPresent({ index: shown + 1 })} />
        ) : (
          <Text variant="meta" color="textMeta" center>
            All the words are showing. Take turns saying them out loud.
          </Text>
        )
      ) : (
        <Text variant="meta" color="textMeta" center>
          {shown < item.words.length ? `${item.byName} shows them one at a time. Try saying each one out loud.` : 'Take turns saying them out loud.'}
        </Text>
      )}
    </View>
  );
}
