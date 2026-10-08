import { View } from 'react-native';
import { Cloud, Sun } from 'lucide-react-native';
import { Text } from '../../components/Text';
import { size, space, teamColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { SIDE_NAME, type Side } from '../tableGame';

const ICON = { sun: Sun, sky: Cloud } as const;

// The two teams, by name and icon (never colour alone), with whose turn it is.
export function TeamsHeader({ teams, turn, people, me }: { teams: Record<Side, string[]>; turn: Side | null; people: Person[]; me: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[3] }}>
      {(['sun', 'sky'] as Side[]).map((side) => {
        const Icon = ICON[side];
        const names = teams[side].map((id) => (id === me ? 'You' : people.find((p) => p.id === id)?.nickname ?? 'Someone'));
        return (
          <View key={side} style={{ flex: 1, gap: space[1], alignItems: side === 'sun' ? 'flex-start' : 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
              <Icon size={size.iconMeta} color={teamColors[side].fg} strokeWidth={size.iconStroke} />
              <Text variant="metaStrong" style={{ color: teamColors[side].fg }}>
                {turn === side ? `${SIDE_NAME[side]}'s turn` : SIDE_NAME[side]}
              </Text>
            </View>
            <Text variant="meta" color="textSoft" numberOfLines={2} center={false}>
              {names.join(', ') || 'Nobody'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
