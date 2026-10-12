import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { SYMBOLS, type AvatarSymbol, type Look } from '../lib/avatars';
import { avatarTints, border, radius, size, space, useColors } from '../theme';
import { Text } from './Text';

const SYMBOL_NAMES = Object.keys(SYMBOLS) as AvatarSymbol[];
// Names for screen readers, in the order of avatarTints.
const TINT_NAMES = ['Clay', 'Green', 'Blue', 'Sand', 'Rose', 'Olive'];

// Pick a colour, then your initial or a symbol. Never a photo (docs/me-page-spec.md).
export function AvatarPicker({ value, initial, onChange }: { value: Look; initial: string; onChange: (look: Look) => void }) {
  const colors = useColors();
  const tint = avatarTints[value.tint ?? 0];
  const swatch = size.avatarList;
  return (
    <View style={{ gap: space[4] }}>
      <View style={{ gap: space[2] }}>
        <Text variant="bodyStrong">Colour</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Colour" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {avatarTints.map((t, i) => {
            const on = value.tint === i;
            return (
              <Pressable
                key={t.bg}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={TINT_NAMES[i] ?? `Colour ${i + 1}`}
                onPress={() => onChange({ ...value, tint: i })}
                style={{
                  width: swatch,
                  height: swatch,
                  borderRadius: radius.pill,
                  backgroundColor: t.bg,
                  borderWidth: border.selected,
                  borderColor: on ? colors.selectedBorder : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Never colour alone: the chosen one has a check. */}
                {on ? <Check size={size.iconMeta} color={t.fg} strokeWidth={size.iconStroke} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: space[2] }}>
        <Text variant="bodyStrong">Inside</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Inside your avatar" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {[null, ...SYMBOL_NAMES].map((name) => {
            const on = value.symbol === name;
            const Symbol = name ? SYMBOLS[name] : null;
            return (
              <Pressable
                key={name ?? 'initial'}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={name ? `Symbol: ${name}` : 'Your initial'}
                onPress={() => onChange({ ...value, symbol: name })}
                style={{
                  width: swatch,
                  height: swatch,
                  borderRadius: radius.pill,
                  backgroundColor: tint.bg,
                  borderWidth: border.selected,
                  borderColor: on ? colors.selectedBorder : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {Symbol ? (
                  <Symbol size={size.icon} color={tint.fg} strokeWidth={size.iconStroke} />
                ) : (
                  <Text variant="heading" style={{ color: tint.fg }}>
                    {initial}
                  </Text>
                )}
                {/* Never colour alone: the chosen one has a check as well as the ring. */}
                {on ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -space[1],
                      right: -space[1],
                      width: size.iconMeta + space[1],
                      height: size.iconMeta + space[1],
                      borderRadius: radius.pill,
                      backgroundColor: colors.text,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={size.iconMeta - space[1]} color={colors.bg} strokeWidth={size.iconStroke} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
