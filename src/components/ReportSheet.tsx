import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { REPORT_DETAILS_MAX, REPORT_REASONS, addReportEvidence, submitReport, type ReportReason, type ReportTarget } from '../lib/safety';
import { looksOffline } from '../lib/validation';
import { border, fonts, radius, rules, size, space, type, useColors } from '../theme';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { RadioRow, SwitchRow } from './Choice';
import { ErrorLine } from './ErrorLine';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type Person = { id: string; nickname: string };

type Props = {
  visible: boolean;
  roomId: string | null;
  people: Person[];
  // Set when started from someone's mini profile: skips "Who".
  startWith: Person | null;
  onClose: () => void;
  onAlsoBlock: (person: Person) => void;
  // Opens the help options. Missing until the help screen exists.
  onSeeHelp?: () => void;
  // What was on the table, sent along with the report (activities.md › Safety).
  evidence?: string | null;
};

type Stage = 'who' | 'what' | 'sent';
const COUNTER_FROM = 400;

// The three report sheets from docs/design/pages/report-and-block.md.
export function ReportSheet({ visible, roomId, people, startWith, onClose, onAlsoBlock, onSeeHelp, evidence }: Props) {
  const colors = useColors();
  const [stage, setStage] = useState<Stage>(startWith ? 'what' : 'who');
  const [target, setTarget] = useState<ReportTarget | null>(startWith);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merged, setMerged] = useState(false);
  const [alsoBlock, setAlsoBlock] = useState(false);

  // Start fresh every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setStage(startWith ? 'what' : 'who');
    setTarget(startWith);
    setReason(null);
    setDetails('');
    setError(null);
    setMerged(false);
    setAlsoBlock(false);
  }, [visible, startWith]);

  const targetName = target === 'room' ? 'this room' : target?.nickname ?? '';

  async function send() {
    if (!target) return;
    const chosen: ReportReason = target === 'room' ? 'room' : reason ?? 'other';
    setBusy(true);
    setError(null);
    try {
      const result = await submitReport(target, roomId, chosen, details);
      if (evidence) await addReportEvidence(roomId, evidence).catch(() => {});
      setMerged(result === 'merged');
      setStage('sent');
    } catch (e) {
      // Keep the chosen reason and text, so nothing has to be typed again.
      setError(
        looksOffline((e as Error).message)
          ? "You're offline. Connect to the internet, then try again."
          : "We couldn't send that. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function done() {
    if (alsoBlock && target && target !== 'room') onAlsoBlock(target);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} dismissable={!busy}>
      {stage === 'who' ? (
        <>
          <Text variant="title">Who do you want to report?</Text>
          <ScrollView style={{ maxHeight: size.sheetList }} contentContainerStyle={{ gap: space[2] }}>
            {people.map((p) => (
              <RadioRow
                key={p.id}
                title={p.nickname}
                selected={target !== 'room' && target?.id === p.id}
                onPress={() => setTarget(p)}
                leading={<Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList} />}
              />
            ))}
            <RadioRow
              title="The whole room"
              line="The room's title or topic breaks the rules."
              selected={target === 'room'}
              onPress={() => setTarget('room')}
            />
          </ScrollView>
          <Button
            label="Next"
            variant="primary"
            disabled={!target}
            onPress={() => setStage('what')}
          />
        </>
      ) : null}

      {stage === 'what' ? (
        <>
          {reason === 'danger' ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.small, padding: space[4], gap: space[2] }}
            >
              <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
                <AlertTriangle size={size.iconMeta} color={colors.danger} strokeWidth={size.iconStroke} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  If someone is in danger right now, contact emergency services.
                </Text>
              </View>
              {onSeeHelp ? <Button label="See help options" onPress={onSeeHelp} /> : null}
            </View>
          ) : null}
          <Text variant="title">{target === 'room' ? 'What about this room?' : `What happened with ${targetName}?`}</Text>
          <ScrollView style={{ maxHeight: size.sheetList }} contentContainerStyle={{ gap: space[2] }} keyboardShouldPersistTaps="handled">
            {target !== 'room'
              ? REPORT_REASONS.map((r) => (
                  <RadioRow key={r.id} title={r.title} line={r.line} selected={reason === r.id} onPress={() => setReason(r.id)} />
                ))
              : null}
            <View style={{ gap: space[2], paddingTop: space[3] }}>
              <Text variant="bodyStrong" accessibilityElementsHidden importantForAccessibility="no">
                Tell us more (optional)
              </Text>
              <TextInput
                accessibilityLabel="Tell us more (optional)"
                value={details}
                onChangeText={(t) => setDetails(t.slice(0, REPORT_DETAILS_MAX))}
                multiline
                maxLength={REPORT_DETAILS_MAX}
                maxFontSizeMultiplier={rules.maxTextScale}
                placeholderTextColor={colors.textMeta}
                selectionColor={colors.ember}
                style={{
                  minHeight: size.input * 2,
                  padding: space[4],
                  borderRadius: radius.small,
                  borderWidth: border.input,
                  borderColor: colors.line,
                  backgroundColor: colors.bg,
                  color: colors.text,
                  fontFamily: fonts.regular,
                  fontSize: type.body.fontSize,
                  textAlignVertical: 'top',
                }}
              />
              <Text variant="meta" color="textMeta">
                Voice isn't recorded, so details help us act. Only the Circles team sees this.
              </Text>
              {details.length >= COUNTER_FROM ? (
                <Text variant="meta" color="textMeta" style={{ fontVariant: ['tabular-nums'] }}>
                  {`${details.length} of ${REPORT_DETAILS_MAX}`}
                </Text>
              ) : null}
            </View>
          </ScrollView>
          {error ? <ErrorLine message={error} /> : null}
          {!startWith ? <Button label="Back" variant="quiet" disabled={busy} onPress={() => setStage('who')} /> : null}
          <Button
            label="Send report"
            variant="primary"
            loading={busy}
            disabled={target !== 'room' && !reason}
            onPress={() => void send()}
          />
        </>
      ) : null}

      {stage === 'sent' ? (
        <>
          <View
            style={{
              width: size.avatarRoom,
              height: size.avatarRoom,
              borderRadius: radius.pill,
              backgroundColor: colors.liveSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={size.icon} color={colors.live} strokeWidth={size.iconStroke} />
          </View>
          <View style={{ gap: space[2] }}>
            <Text variant="title" accessibilityLiveRegion="polite">
              Thanks for telling us.
            </Text>
            <Text variant="body" color="textSoft">
              {merged
                ? "We've added this to your earlier report."
                : target === 'room'
                  ? 'The Circles team will look at this.'
                  : `The Circles team will look at this. ${targetName} won't know who reported them.`}
            </Text>
          </View>
          {target && target !== 'room' ? (
            <SwitchRow
              title={`Also block ${targetName}`}
              line="You won't be put in a room together again."
              value={alsoBlock}
              onChange={setAlsoBlock}
            />
          ) : null}
          <Button label="Done" variant="primary" onPress={done} />
        </>
      ) : null}
    </Sheet>
  );
}
