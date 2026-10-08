import type { ReactNode } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ellipsis, ExternalLink, Flag, Hand, MicOff, X } from 'lucide-react-native';
import { linkSite, type TableItem } from '../../table/model';
import { border, effects, radius, size, space, speaking, tableCard, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { Avatar } from '../Avatar';
import { Sheet } from '../Sheet';
import { Text } from '../Text';

const VERB: Record<TableItem['kind'], string> = {
  note: 'put a note on the table',
  video: 'put a video on the table',
  photos: 'is showing photos',
  screen: 'is sharing their screen',
  turns: 'started taking turns',
  quiz: 'asked a question',
  words: 'put words on the table',
};

// While something is on the table, the seats move up into a row of small avatars (design direction ›
// The table). Tapping one opens save, block and report, like a seat in the circle.
export function SeatRow({ people, onPerson }: { people: Person[]; onPerson: (p: Person) => void }) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3], paddingVertical: space[2] }}>
      {people.map((p) => {
        const parts = [p.isMe ? 'You' : p.nickname];
        if (p.isHost) parts.push('host');
        if (p.isSpeaking) parts.push('speaking');
        else if (p.isMuted) parts.push('muted');
        if (p.handUp) parts.push('hand up');
        return (
          <Pressable
            key={p.id}
            accessibilityRole={p.isMe ? undefined : 'button'}
            accessibilityLabel={parts.join(', ')}
            disabled={p.isMe}
            onPress={() => onPerson(p)}
            style={{ alignItems: 'center', gap: space[1], width: size.avatarList + space[4] }}
          >
            <View
              style={{
                borderRadius: radius.pill,
                borderWidth: speaking.ring,
                borderColor: p.isSpeaking ? colors.live : 'transparent',
                padding: border.selected,
              }}
            >
              <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
              {p.handUp || p.isMuted ? (
                <View
                  style={{
                    position: 'absolute',
                    right: -space[1],
                    bottom: -space[1],
                    width: size.avatarBadge,
                    height: size.avatarBadge,
                    borderRadius: radius.pill,
                    backgroundColor: p.handUp ? colors.emberSoft : colors.raised,
                    borderWidth: border.seatRing,
                    borderColor: colors.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.handUp ? (
                    <Hand size={size.iconBadge} color={colors.emberText} strokeWidth={size.iconStroke} />
                  ) : (
                    <MicOff size={size.iconBadge} color={colors.textSoft} strokeWidth={size.iconStroke} />
                  )}
                </View>
              ) : null}
            </View>
            {/* Only the speaker is named, as in the design; screen readers hear everyone's name. */}
            <Text variant="tiny" color={p.isSpeaking ? 'live' : 'emberText'} numberOfLines={1} importantForAccessibility="no">
              {p.isSpeaking ? (p.isMe ? 'You' : p.nickname) : p.handUp ? 'Hand up' : ' '}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// The table card: raised, lit by the lamp, with who put it there and a 44 px options button.
export function TableCard({ item, me, onOptions, children }: { item: TableItem; me: string; onOptions: () => void; children: ReactNode }) {
  const colors = useColors();
  const who = item.by === me ? 'You' : item.byName;
  const verb = item.by === me ? VERB[item.kind].replace('is ', 'are ').replace('their', 'your') : VERB[item.kind];
  return (
    <View
      style={{
        backgroundColor: colors.raised,
        borderRadius: radius.card,
        padding: space[5],
        gap: space[4],
        shadowColor: colors.ember,
        shadowRadius: tableCard.shadowRadius,
        shadowOpacity: tableCard.shadowOpacity,
        shadowOffset: { width: 0, height: 0 },
        elevation: tableCard.elevation,
        ...(Platform.OS === 'web' ? { boxShadow: effects.tableGlowWeb } : null),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Avatar userId={item.by} nickname={item.byName} diameter={size.avatarBadge} />
        <Text variant="meta" color="textSoft" style={{ flex: 1 }} numberOfLines={2}>
          {`${who} ${verb}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Options for what's on the table"
          onPress={onOptions}
          style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center', marginRight: -space[3] }}
        >
          <Ellipsis size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

// Links leave the app, so people are told first (activities.md › Safety).
function openLink(link: string) {
  const go = () => void Linking.openURL(link).catch(() => {});
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`You're leaving Circles to open ${linkSite(link)}.`)) go();
    return;
  }
  Alert.alert("You're leaving Circles", `This opens ${linkSite(link)} in your browser. Circles doesn't check other sites.`, [
    { text: 'Stay here', style: 'cancel' },
    { text: 'Open', onPress: go },
  ]);
}

// A note: the first line reads as its headline (docs/screens/19-note-on-the-table.png).
export function NoteBody({ item }: { item: Extract<TableItem, { kind: 'note' }> }) {
  const colors = useColors();
  // The link itself shows only as its site name, below.
  const shown = item.link ? item.text.replace(/https?:\/\/[^\s<>"']+/i, '').replace(/[ \t]+\n/g, '\n').trim() : item.text;
  const [first, ...rest] = (shown || linkSite(item.link ?? '')).split('\n');
  const more = rest.join('\n').trim();
  return (
    <View style={{ gap: space[3] }}>
      <Text variant="heading" selectable>
        {first}
      </Text>
      {more ? (
        <Text variant="body" color="textSoft" selectable>
          {more}
        </Text>
      ) : null}
      {item.link ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${linkSite(item.link)}. Leaves Circles`}
          onPress={() => openLink(item.link as string)}
          style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[2], alignSelf: 'flex-start' }}
        >
          <ExternalLink size={size.iconMeta} color={colors.textSoft} strokeWidth={size.iconStroke} />
          <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
            {linkSite(item.link)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Options on a table item: take it off (the presenter or a host) and report. Nothing else.
export function TableOptionsSheet({
  visible,
  canTakeOff,
  onClose,
  onTakeOff,
  onReport,
}: {
  visible: boolean;
  canTakeOff: boolean;
  onClose: () => void;
  onTakeOff: () => void;
  onReport: () => void;
}) {
  const colors = useColors();
  const row = (Icon: typeof X, label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: size.buttonPrimary, flexDirection: 'row', alignItems: 'center', gap: space[3] }}
    >
      <Icon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="title" accessibilityRole="header">
        What's on the table
      </Text>
      <View>
        {canTakeOff ? row(X, 'Take it off the table', onTakeOff) : null}
        {row(Flag, 'Report it', onReport)}
      </View>
    </Sheet>
  );
}
