import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';
import { Pressable, View, type ScrollView } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { Compass, Home, Users } from 'lucide-react-native';
import { Avatar } from '../components/Avatar';
import { Text } from '../components/Text';
import { border, fonts, radius, size, space, useColors } from '../theme';

// The bottom bar: Home, Explore, Groups, Me (docs/design/pages/tabs.md, Sammy's decision 2026-10-08).
// Shown on the four main pages and the pages opened from them; hidden in rooms, sign-up and Start.

export type Tab = 'home' | 'explore' | 'groups' | 'me';
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'explore', label: 'Explore' },
  { id: 'groups', label: 'Groups' },
  { id: 'me', label: 'Me' },
];

type TabsContext = {
  // Tapping the tab you're already on scrolls that page to the top.
  register: (tab: Tab, toTop: () => void) => () => void;
};
const Ctx = createContext<TabsContext | null>(null);
export const TabsProvider = Ctx.Provider;

// Pages inside the bar leave the bottom safe area to it.
export function useScreenEdges(): Edge[] | undefined {
  return useContext(Ctx) ? ['top', 'left', 'right'] : undefined;
}

// A main page's scroll view: tapping its tab again scrolls it to the top.
export function useTabScroll(tab: Tab): RefObject<ScrollView | null> {
  const ctx = useContext(Ctx);
  const ref = useRef<ScrollView | null>(null);
  useEffect(() => ctx?.register(tab, () => ref.current?.scrollTo({ y: 0, animated: true })), [ctx, tab]);
  return ref;
}

export function TabBar({
  current,
  me,
  groupsDot,
  onSelect,
  onReselect,
}: {
  current: Tab | null;
  me: { id: string; nickname: string };
  // Something new in Groups (an invitation, or a group starting soon).
  groupsDot?: boolean;
  onSelect: (tab: Tab) => void;
  onReselect: (tab: Tab) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        minHeight: size.bottomNav + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: colors.surface,
        borderTopWidth: border.hairline,
        borderTopColor: colors.line,
      }}
    >
      {TABS.map((t, i) => {
        const on = current === t.id;
        const tint = on ? colors.text : colors.textMeta;
        const Icon = t.id === 'home' ? Home : t.id === 'explore' ? Compass : Users;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.label}, ${i + 1} of ${TABS.length}${t.id === 'groups' && groupsDot ? ', something new' : ''}`}
            onPress={() => (on ? onReselect(t.id) : onSelect(t.id))}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[1], minHeight: size.bottomNav }}
          >
            {/* Never colour alone: the selected tab also has the pill. */}
            <View
              style={{
                width: size.tabPill,
                height: size.tabPillHeight,
                borderRadius: radius.pill,
                backgroundColor: on ? colors.text : 'transparent',
              }}
            />
            <View>
              {t.id === 'me' ? (
                <View style={{ borderRadius: radius.pill, borderWidth: border.selected, borderColor: on ? colors.text : 'transparent' }}>
                  <Avatar userId={me.id} nickname={me.nickname} diameter={size.icon} />
                </View>
              ) : (
                <Icon size={size.icon} color={tint} strokeWidth={size.iconStroke} />
              )}
              {t.id === 'groups' && groupsDot ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -space[1],
                    right: -space[1],
                    width: size.newDot,
                    height: size.newDot,
                    borderRadius: radius.pill,
                    backgroundColor: colors.ember,
                  }}
                />
              ) : null}
            </View>
            <Text variant="tiny" numberOfLines={1} style={{ color: tint, fontFamily: on ? fonts.extraBold : fonts.bold }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
