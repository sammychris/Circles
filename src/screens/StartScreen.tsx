import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { RadioRow } from '../components/Choice';
import { RoomRulesSheet } from '../components/RoomRulesSheet';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { WEB_URL } from '../config';
import { allowReminders, reminderNote } from '../lib/reminders';
import { WEEKDAYS_SHORT, WEEK_ORDER, clockWords, dayAndTime, weeklyWords } from '../lib/when';
import { BadTitleError, TooManyRoomsError, scheduleRoom, type RoomRequest } from '../rooms/api';
import { LEARN_CAPACITY, LEVELS, subjectById, type LearnLevel } from '../rooms/learn';
import { ROOM_SIZES, TITLE_MAX, TITLE_PROBLEM_TEXT, TOPICS, titleProblem, type Topic } from '../rooms/start';
import { border, fonts, opacity, radius, size, space, useColors } from '../theme';

// One choice in a row of pills. Selected: 2 px warm-white border and a check, never colour alone.
function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.minTarget,
        minWidth: size.minTarget,
        paddingHorizontal: space[4],
        borderRadius: radius.pill,
        borderWidth: border.selected,
        borderColor: selected ? colors.selectedBorder : 'transparent',
        backgroundColor: selected ? colors.raised : colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      {selected ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : null}
      <Text variant="metaStrong" style={selected ? { fontFamily: fonts.extraBold } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const STEP_MIN = 15;
const DAY_MIN = 24 * 60;

// A time of day in 15-minute steps. Big buttons either side, the time in the middle.
function TimeStepper({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const colors = useColors();
  const at = new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60);
  const button = (label: string, Icon: typeof Minus, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold to move a whole hour."
      onPress={() => onChange((minutes + delta + DAY_MIN) % DAY_MIN)}
      onLongPress={() => onChange((minutes + delta * 4 + DAY_MIN) % DAY_MIN)}
      style={({ pressed }) => ({
        width: size.minTarget + space[2],
        height: size.minTarget + space[2],
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <Icon size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
      {button('15 minutes earlier', Minus, -STEP_MIN)}
      <Text variant="title" accessibilityLiveRegion="polite" style={{ minWidth: size.rowAction, textAlign: 'center' }}>
        {clockWords(at)}
      </Text>
      {button('15 minutes later', Plus, STEP_MIN)}
    </View>
  );
}

// The next whole hour, as minutes after midnight (a sensible first time to offer).
function nextHour(now = new Date()): number {
  return ((now.getHours() + 1) % 24) * 60;
}

// Start something › Once or every week? `now` opens the room straight away; `later` sets it for a
// time in the next week; `weekly` makes a group that meets on set days.
export type StartWhen = 'now' | 'later' | 'weekly';

type Props = {
  door: 'talk' | 'play' | 'learn';
  // Learn rooms: the language or skill (learn.md › "Start an Igbo practice group").
  subject?: string;
  // What they typed before, when a room didn't start and they came back to change it.
  draft?: Extract<RoomRequest, { kind: 'create' }>;
  onBack: () => void;
  onStart: (request: RoomRequest) => void;
  // Opened from Explore or Groups: Talk or Play can still be chosen here.
  chooseDoor?: boolean;
  // Which "when" is chosen to begin with (Groups › Start a group opens with Every week).
  when?: StartWhen;
  // After a room or group is scheduled: back to where it shows, with this note.
  onScheduled: (message: string) => void;
};

// Start something (docs/design/pages/start-something.md, docs/screens/17): Talk, Play or Learn, starting
// now, at a set time this week, or every week as a group. Hosted rooms come later.
export function StartScreen({ door: firstDoor, subject, draft, onBack, onStart, chooseDoor = false, when: firstWhen, onScheduled }: Props) {
  const [door, setDoor] = useState(firstDoor);
  const colors = useColors();
  const learnSubject = door === 'learn' ? subjectById(draft?.language ?? subject) : null;
  const [title, setTitle] = useState(draft?.title ?? (learnSubject ? `${learnSubject.name} practice` : ''));
  const [level, setLevel] = useState<LearnLevel | null>(draft?.level ?? null);
  const [levelError, setLevelError] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic | null>(draft?.topic ?? null);
  const [capacity, setCapacity] = useState<number>(draft?.capacity ?? (door === 'learn' ? LEARN_CAPACITY : 6));
  const sizes: number[] = door === 'learn' ? [...ROOM_SIZES, LEARN_CAPACITY] : [...ROOM_SIZES];
  // Nobody is listed publicly without choosing it (design direction: nothing is chosen for people).
  const [inviteOnly, setInviteOnly] = useState<boolean | null>(draft ? draft.private : null);
  const [error, setError] = useState<string | null>(
    draft ? (titleProblem(draft.title) ? TITLE_PROBLEM_TEXT[titleProblem(draft.title)!] : null) : null,
  );
  const [whoError, setWhoError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const talk = door === 'talk';
  // Invite-only rooms are opened by a link, and links need the web version to be online.
  const canInvite = !!WEB_URL;
  const [when, setWhen] = useState<StartWhen>(draft ? 'now' : (firstWhen ?? 'now'));
  // Later: how many days from today (0 = today), and the time as minutes after midnight.
  const [dayOffset, setDayOffset] = useState(0);
  const [minutes, setMinutes] = useState(() => nextHour());
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [whenError, setWhenError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const laterAt = (() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return d;
  })();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { offset: i, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}` };
  });

  // Later or Every week: the room server keeps it, and the phone reminds you.
  const schedule = async (cleanTitle: string) => {
    if (when === 'later' && laterAt.getTime() < Date.now() + 5 * 60_000) {
      setWhenError('Pick a time at least 5 minutes from now.');
      return;
    }
    if (when === 'weekly' && weekDays.length === 0) {
      setWhenError('Choose at least one day.');
      return;
    }
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    setBusy(true);
    setSendError(null);
    try {
      await scheduleRoom({
        door,
        title: cleanTitle,
        topic: talk ? topic : null,
        capacity,
        ...(door === 'learn' && learnSubject && level ? { language: learnSubject.id, level } : {}),
        ...(when === 'later'
          ? { startsAt: laterAt.toISOString() }
          : { weekly: { days: weekDays, time, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos' } }),
      });
      const note = reminderNote(await allowReminders());
      onScheduled(
        (when === 'later'
          ? `${cleanTitle} is set for ${dayAndTime(laterAt).replace(/^(Today|Tonight|Tomorrow)/, (w) => w.toLowerCase())}. ${note}`
          : `${cleanTitle} meets ${weeklyWords(weekDays, time).replace(/^Every/, 'every')}. ${note}`
        ).trim(),
      );
    } catch (e) {
      if (e instanceof BadTitleError) setError("That name can't be used. Pick another.");
      else if (e instanceof TooManyRoomsError)
        setSendError(
          when === 'weekly'
            ? 'You already run three weekly groups. End one first.'
            : "You've scheduled a few rooms today. Try again tomorrow.",
        );
      else setSendError("That didn't work. Check that you're online, then try again.");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    const problem = titleProblem(title);
    if (problem) setError(TITLE_PROBLEM_TEXT[problem]);
    const needsLevel = door === 'learn' && !level;
    if (needsLevel) setLevelError('Choose a level.');
    // Scheduled rooms and groups are listed for anyone during the open test (invitations come next).
    if (when !== 'now') {
      setWhoError(null);
      if (problem || needsLevel || busy) return;
      void schedule(title.replace(/\s+/g, ' ').trim());
      return;
    }
    if (inviteOnly === null) setWhoError('Choose who can join.');
    if (problem || inviteOnly === null || needsLevel) return;
    onStart({
      kind: 'create',
      door,
      title: title.replace(/\s+/g, ' ').trim(),
      topic: talk ? topic : null,
      capacity,
      private: !!inviteOnly && canInvite,
      ...(door === 'learn' && learnSubject && level ? { language: learnSubject.id, level } : {}),
    });
  };

  return (
    <AuthLayout
      title={
        learnSubject
          ? `Start a ${learnSubject.name} practice group`
          : when === 'weekly'
            ? `Start a weekly ${talk ? 'talk' : 'game'} group`
            : talk
              ? 'Start a talk room'
              : 'Start a game room'
      }
      body={
        learnSubject
          ? 'Practise out loud with people at your level.'
          : talk
            ? 'Pick a name people will want to join.'
            : 'Play Ludo or Find the Impostor with people you invite, or anyone.'
      }
      onBack={onBack}
      footer={
        <>
          {sendError ? <ErrorLine message={sendError} /> : null}
          <Button
            label={when === 'now' ? 'Start the room' : when === 'later' ? 'Schedule the room' : 'Create group'}
            variant="primary"
            onPress={start}
            loading={busy}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: space[1] }}>
            <Text variant="meta" color="textMeta">
              {when === 'now' ? 'It opens now and goes live when someone joins.' : 'It opens 5 minutes before the time.'}
            </Text>
            <Pressable accessibilityRole="link" onPress={() => setRulesOpen(true)} hitSlop={space[3]}>
              <Text variant="metaStrong" style={{ textDecorationLine: 'underline' }}>
                Room rules
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      {chooseDoor && door !== 'learn' ? (
        <View style={{ gap: space[3] }}>
          <Text variant="bodyStrong">What kind?</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Pill label="Talk" selected={door === 'talk'} onPress={() => setDoor('talk')} />
            <Pill label="Play" selected={door === 'play'} onPress={() => setDoor('play')} />
          </View>
        </View>
      ) : null}

      <TextField
        label={when === 'weekly' ? 'Name your group' : 'Name your room'}
        placeholder={talk ? 'Arsenal fans, Owambe stories…' : 'Ludo with the guys'}
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          if (error) setError(null);
        }}
        maxLength={TITLE_MAX + 10}
        error={error}
        helper={`Up to ${TITLE_MAX} characters. Everyone in the room sees it.`}
        returnKeyType="done"
      />

      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">Once or every week?</Text>
        <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
          <RadioRow
            title="Just once"
            line="Now, or at a set time this week."
            selected={when !== 'weekly'}
            onPress={() => {
              if (when === 'weekly') setWhen('now');
              setWhenError(null);
            }}
          />
          <RadioRow
            title="Every week"
            line="Makes a group. Each meeting opens a room."
            selected={when === 'weekly'}
            onPress={() => {
              setWhen('weekly');
              setWhenError(null);
            }}
          />
        </View>
        {when !== 'weekly' ? (
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Pill
              label="Now"
              selected={when === 'now'}
              onPress={() => {
                setWhen('now');
                setWhenError(null);
              }}
            />
            {days.map((d) => (
              <Pill
                key={d.offset}
                label={d.label}
                selected={when === 'later' && dayOffset === d.offset}
                onPress={() => {
                  setWhen('later');
                  setDayOffset(d.offset);
                  setWhenError(null);
                }}
              />
            ))}
          </View>
        ) : (
          <View accessibilityRole="none" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {WEEK_ORDER.map((d) => {
              const on = weekDays.includes(d);
              return (
                <Pressable
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={WEEKDAYS_SHORT[d]}
                  onPress={() => {
                    setWeekDays(on ? weekDays.filter((x) => x !== d) : [...weekDays, d]);
                    setWhenError(null);
                  }}
                  style={({ pressed }) => ({
                    minHeight: size.minTarget,
                    minWidth: size.minTarget + space[3],
                    paddingHorizontal: space[3],
                    borderRadius: radius.pill,
                    borderWidth: border.selected,
                    borderColor: on ? colors.selectedBorder : 'transparent',
                    backgroundColor: on ? colors.raised : colors.surface,
                    flexDirection: 'row',
                    gap: space[1],
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? opacity.pressed : 1,
                  })}
                >
                  {on ? <Check size={size.iconMeta} color={colors.text} strokeWidth={size.iconStroke} /> : null}
                  <Text variant="metaStrong" style={on ? { fontFamily: fonts.extraBold } : undefined}>
                    {WEEKDAYS_SHORT[d]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {when !== 'now' ? (
          <View style={{ gap: space[2] }}>
            <TimeStepper
              minutes={minutes}
              onChange={(m) => {
                setMinutes(m);
                setWhenError(null);
              }}
            />
            <Text variant="meta" color="textSoft">
              {when === 'later'
                ? dayAndTime(laterAt)
                : weekDays.length
                  ? weeklyWords(weekDays, `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
                  : 'Choose the days it meets.'}
            </Text>
          </View>
        ) : null}
        {whenError ? <ErrorLine message={whenError} /> : null}
      </View>

      {talk ? (
        <View style={{ gap: space[3] }}>
          <Text variant="bodyStrong">What's it about? (optional)</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {TOPICS.map((t) => (
              <Pill key={t.id} label={t.label} selected={topic === t.id} onPress={() => setTopic(topic === t.id ? null : t.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {learnSubject ? (
        <View style={{ gap: space[3] }}>
          <Text variant="bodyStrong">Level</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {LEVELS.map((l) => (
              <Pill
                key={l.id}
                label={l.label}
                selected={level === l.id}
                onPress={() => {
                  setLevel(l.id);
                  setLevelError(null);
                }}
              />
            ))}
          </View>
          {levelError ? <ErrorLine message={levelError} /> : null}
        </View>
      ) : null}

      <View style={{ gap: space[3] }}>
        <Text variant="bodyStrong">How many people?</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {sizes.map((n) => (
            <Pill key={n} label={`Up to ${n}`} selected={capacity === n} onPress={() => setCapacity(n)} />
          ))}
        </View>
      </View>

      {when !== 'now' ? (
        <Text variant="meta" color="textSoft">
          Listed in Explore, so anyone can see it and set a reminder.
        </Text>
      ) : (
        <View style={{ gap: space[3] }}>
          <Text variant="bodyStrong">Who can join?</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
            <RadioRow
              title="Anyone"
              line={
                learnSubject
                  ? `Listed on the ${learnSubject.name} page for anyone to join.`
                  : talk
                    ? 'Listed under "I want to talk" for anyone to join.'
                    : 'Listed under "Let\'s play" for anyone to join.'
              }
              selected={inviteOnly === false}
              onPress={() => {
                setInviteOnly(false);
                setWhoError(null);
              }}
            />
            <RadioRow
              title="Invite only"
              line={
                canInvite
                  ? 'Not listed. Only people you send the link to can join.'
                  : 'Comes once the web version of Circles is online, so links work.'
              }
              selected={inviteOnly === true && canInvite}
              disabled={!canInvite}
              onPress={() => {
                setInviteOnly(true);
                setWhoError(null);
              }}
            />
          </View>
          {whoError ? <ErrorLine message={whoError} /> : null}
        </View>
      )}
      <RoomRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </AuthLayout>
  );
}
