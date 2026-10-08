import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Heart, X } from 'lucide-react-native';
import { Avatar } from '../components/Avatar';
import { BlockSheet } from '../components/BlockSheet';
import { Button } from '../components/Button';
import { ReportSheet } from '../components/ReportSheet';
import { Text } from '../components/Text';
import { Toast } from '../components/Toast';
import { mySavedIds, savePerson, thankPerson, unsavePerson, unthankPerson } from '../lib/people';
import type { Blocked } from '../lib/safety';
import type { RoomSummary, SeenPerson } from '../voice/useVoiceRoom';
import { border, size, space, useColors } from '../theme';

type Props = { me: { id: string; nickname: string }; summary: RoomSummary; onDone: () => void };

function role(p: SeenPerson): string {
  if (p.isHost) return 'Host';
  return p.spoke ? 'Spoke' : 'Listened';
}

// "Thanks for being there" (docs/screens/07-after-the-room.png). Nothing here is pre-selected.
export function AfterRoomScreen({ me, summary, onDone }: Props) {
  const colors = useColors();
  const people = summary.seen.filter((p) => p.id !== me.id);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [thanked, setThanked] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [toBlock, setToBlock] = useState<Blocked | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void mySavedIds()
      .then(setSaved)
      .catch(() => {});
  }, []);

  function flip(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function toggleSave(p: SeenPerson) {
    const was = saved.has(p.id);
    setSaved((s) => flip(s, p.id));
    try {
      if (was) await unsavePerson(me.id, p.id);
      else await savePerson(me.id, p);
    } catch {
      setSaved((s) => flip(s, p.id));
      setToast("That didn't save. Check your connection.");
    }
  }

  async function toggleThanks(p: SeenPerson) {
    const was = thanked.has(p.id);
    setThanked((s) => flip(s, p.id));
    try {
      if (was) await unthankPerson(me.id, p.id, summary.room.id);
      else await thankPerson(me.id, p.id, summary.room.id);
    } catch {
      setThanked((s) => flip(s, p.id));
      setToast("That didn't send. Check your connection.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ minHeight: size.minTarget, paddingHorizontal: space[3], alignItems: 'flex-end', justifyContent: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onDone}
          style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space[6], gap: space[6] }}>
        <View style={{ gap: space[2] }}>
          <Text variant="display" accessibilityRole="header">
            Thanks for being there
          </Text>
          <Text variant="body" color="textSoft">
            {`${summary.minutes} ${summary.minutes === 1 ? 'minute' : 'minutes'} in ${summary.room.title}`}
          </Text>
        </View>

        {people.length > 0 ? (
          <View style={{ gap: space[3] }}>
            <View style={{ gap: space[1] }}>
              <Text variant="heading">Anyone you clicked with?</Text>
              <Text variant="body" color="textSoft">
                Saving is secret. You only connect if they save you too.
              </Text>
            </View>
            {people.map((p) => {
              const isSaved = saved.has(p.id);
              const isThanked = thanked.has(p.id);
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.avatarRoom }}>
                  <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />
                  <View style={{ flex: 1, gap: space[1] }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {p.nickname}
                    </Text>
                    <Text variant="meta" color={isThanked ? 'emberText' : 'textSoft'}>
                      {isThanked ? 'Thank-you sent' : role(p)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isThanked ? `Thank-you sent to ${p.nickname}. Tap to undo` : `Thank ${p.nickname}`}
                    onPress={() => void toggleThanks(p)}
                    style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Heart
                      size={size.icon}
                      color={isThanked ? colors.emberText : colors.textSoft}
                      fill={isThanked ? colors.emberText : 'transparent'}
                      strokeWidth={size.iconStroke}
                    />
                  </Pressable>
                  <Button
                    label={isSaved ? 'Saved' : 'Save'}
                    icon={isSaved ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : undefined}
                    onPress={() => void toggleSave(p)}
                    style={[
                      { width: size.rowAction },
                      isSaved ? { borderWidth: border.selected, borderColor: colors.selectedBorder } : null,
                    ]}
                  />
                </View>
              );
            })}
          </View>
        ) : null}

        {people.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[3],
              paddingTop: space[5],
              borderTopWidth: border.hairline,
              borderTopColor: colors.divider,
              flexWrap: 'wrap',
            }}
          >
            <Text variant="heading" style={{ flex: 1, minWidth: size.rowAction * 1.5 }}>
              Was everyone kind?
            </Text>
            <Button
              label={kind ? 'Thanks' : 'Yes'}
              icon={kind ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : undefined}
              onPress={() => setKind(true)}
            />
            <Button label="Report someone" variant="quiet" onPress={() => setReportOpen(true)} />
          </View>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>
        <Toast message={toast} onDone={() => setToast(null)} />
        <Button label="Done" variant="primary" onPress={onDone} />
      </View>
      <ReportSheet
        visible={reportOpen}
        roomId={summary.room.id}
        people={people.map((p) => ({ id: p.id, nickname: p.nickname }))}
        startWith={null}
        onClose={() => setReportOpen(false)}
        onAlsoBlock={(p) => setToBlock(p)}
      />
      <BlockSheet
        me={me.id}
        person={toBlock}
        onClose={() => setToBlock(null)}
        onBlocked={(p) => {
          setToBlock(null);
          setSaved((s) => {
            const next = new Set(s);
            next.delete(p.id);
            return next;
          });
          void unsavePerson(me.id, p.id).catch(() => {});
          setToast(`${p.nickname} is blocked.`);
        }}
      />
    </SafeAreaView>
  );
}
