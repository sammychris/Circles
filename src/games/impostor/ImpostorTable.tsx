import { Pressable, ScrollView, View } from 'react-native';
import { Check, Lock } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { RadioRow } from '../../components/Choice';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { clock } from '../../rooms/phase';
import { border, fonts, opacity, radius, size, space, type as typeScale, useColors } from '../../theme';
import { ROUNDS_PER_GAME, caught, phaseAt, seatState, type ImpostorRound, type Result, type SeatState } from './logic';

type Person = { id: string; nickname: string; isMe: boolean; isSpeaking: boolean; isMuted: boolean };

const SEAT_WORD: Record<SeatState, string | null> = { done: 'Done', talking: 'Talking', next: 'Next', waiting: null };

function OrderSeat({ person, state, onPress }: { person: Person | undefined; state: SeatState; onPress: () => void }) {
  const colors = useColors();
  const name = person ? (person.isMe ? 'You' : person.nickname) : 'Someone';
  const ring = state === 'talking' ? colors.live : state === 'next' ? colors.emberText : 'transparent';
  const label =
    state === 'next' && person?.isMe ? 'You next' : state === 'waiting' || !SEAT_WORD[state] ? name : SEAT_WORD[state];
  const labelColor = state === 'talking' ? 'live' : state === 'next' ? 'emberText' : state === 'done' ? 'textMeta' : 'textSoft';
  return (
    <Pressable
      accessibilityRole={person && !person.isMe ? 'button' : undefined}
      accessibilityLabel={`${name}, ${state === 'waiting' ? 'waiting to talk' : state === 'next' ? 'next' : state}`}
      disabled={!person || person.isMe}
      onPress={onPress}
      style={{ alignItems: 'center', gap: space[1], width: size.avatarList + space[4], opacity: state === 'done' ? opacity.disabled : 1 }}
    >
      <View style={{ borderRadius: radius.pill, borderWidth: border.selected, borderColor: ring, padding: border.selected }}>
        <Avatar userId={person?.id ?? '?'} nickname={person?.nickname ?? '?'} diameter={size.avatarList} />
      </View>
      <Text variant="tiny" color={labelColor} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

type Props = {
  round: ImpostorRound;
  now: number;
  me: string;
  people: Person[];
  playing: boolean;
  card: string | null; // null while loading, '' for the impostor
  hidden: boolean;
  onShowWord: () => void;
  myVote: string | null;
  outcome: Result | null;
  onVote: (target: string) => void;
  onPerson: (p: Person) => void;
  onNextRound: () => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
  busy: boolean;
};

// Find the Impostor on the table (docs/screens/12-find-the-impostor.png, play.md).
export function ImpostorTable({
  round,
  now,
  me,
  people,
  playing,
  card,
  hidden,
  onShowWord,
  myVote,
  outcome,
  onVote,
  onPerson,
  onNextRound,
  onPlayAgain,
  onBackToTalking,
  busy,
}: Props) {
  const colors = useColors();
  const phase = phaseAt(round, now);
  const byId = new Map(people.map((p) => [p.id, p]));
  const nameOf = (id: string) => (id === me ? 'You' : byId.get(id)?.nickname ?? 'Someone who left');
  const speakerName = phase.kind === 'speaking' ? nameOf(phase.speaker) : '';

  let footer: { left: string; right: string };
  if (outcome) footer = { left: 'Round over', right: '' };
  else if (phase.kind === 'speaking') {
    footer = { left: phase.speaker === me ? "You're talking" : `${speakerName} is talking`, right: clock(phase.secondsLeft) };
  } else footer = { left: 'Time to vote', right: clock(phase.secondsLeft) };

  const wordBlock = () => {
    if (!playing) {
      return (
        <Text variant="title" center>
          You're watching this round
        </Text>
      );
    }
    if (card === null) {
      return (
        <Text variant="body" color="textSoft" center>
          Getting your card…
        </Text>
      );
    }
    if (hidden) {
      return (
        <Pressable accessibilityRole="button" onPress={onShowWord} style={{ minHeight: size.minTarget, justifyContent: 'center' }}>
          <Text variant="title" center color="textSoft">
            Word hidden. Tap to show.
          </Text>
        </Pressable>
      );
    }
    if (card === '') {
      return (
        <Text style={{ ...typeScale.title, color: colors.emberText, textAlign: 'center' }} accessibilityRole="header">
          You're the impostor
        </Text>
      );
    }
    return (
      <Text style={{ ...typeScale.giant, color: colors.text, textAlign: 'center' }} accessibilityRole="header">
        {card}
      </Text>
    );
  };

  const counts = new Map((outcome?.counts ?? []).map((c) => [c.target, c.votes]));

  return (
    <View style={{ gap: space[5] }}>
      <Text variant="metaStrong" color="textSoft" center>
        {`Find the Impostor, round ${round.number} of ${ROUNDS_PER_GAME}`}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[1], paddingHorizontal: space[1] }}>
        {round.order.map((id) => (
          <OrderSeat
            key={id}
            person={byId.get(id)}
            state={seatState(round, phase, id)}
            onPress={() => {
              const p = byId.get(id);
              if (p) onPerson(p);
            }}
          />
        ))}
      </ScrollView>

      {people.some((p) => !round.order.includes(p.id)) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
          <Text variant="meta" color="textMeta">
            Also here:
          </Text>
          {people
            .filter((p) => !round.order.includes(p.id))
            .map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole={p.isMe ? undefined : 'button'}
                accessibilityLabel={`${p.isMe ? 'You' : p.nickname}, watching${p.isSpeaking ? ', speaking' : ''}`}
                disabled={p.isMe}
                onPress={() => onPerson(p)}
                style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[1] }}
              >
                <View style={{ borderRadius: radius.pill, borderWidth: border.selected, borderColor: p.isSpeaking ? colors.live : 'transparent' }}>
                  <Avatar userId={p.id} nickname={p.nickname} diameter={size.avatarList - space[3]} />
                </View>
                <Text variant="metaStrong" color={p.isSpeaking ? 'live' : 'textSoft'}>
                  {p.isMe ? 'You' : p.nickname}
                </Text>
              </Pressable>
            ))}
        </View>
      ) : null}

      {outcome ? (
        <View style={{ backgroundColor: colors.raised, borderRadius: radius.card, padding: space[5], gap: space[3] }} accessibilityLiveRegion="polite">
          <Text variant="title" center>
            {`${nameOf(outcome.impostor)} ${outcome.impostor === me ? 'were' : 'was'} the impostor`}
          </Text>
          <Text variant="body" color="textSoft" center>
            {`The word was ${outcome.word}. ${caught(outcome) ? 'The room found them.' : 'They blended in.'}`}
          </Text>
          <View style={{ gap: space[2], paddingTop: space[2] }}>
            {round.order.map((id) => (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <Avatar userId={id} nickname={byId.get(id)?.nickname ?? '?'} diameter={size.avatarList - space[3]} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {nameOf(id)}
                </Text>
                <Text variant="meta" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>
                  {`${counts.get(id) ?? 0} ${(counts.get(id) ?? 0) === 1 ? 'vote' : 'votes'}`}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="meta" color="textMeta" center>
            Votes only count for the game. Nobody leaves the room, and nothing is kept.
          </Text>
          {round.number < ROUNDS_PER_GAME ? (
            <TableAction label={busy ? 'Dealing…' : 'Next round'} disabled={busy} onPress={onNextRound} />
          ) : (
            <>
              <Text variant="heading" center>
                Good game.
              </Text>
              <TableAction label={busy ? 'Dealing…' : 'Play again'} disabled={busy} onPress={onPlayAgain} />
              <Pressable
                accessibilityRole="button"
                onPress={onBackToTalking}
                style={{ minHeight: size.minTarget, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text variant="bodyStrong" color="textSoft">
                  Back to talking
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={{ backgroundColor: colors.raised, borderRadius: radius.card, padding: space[5], gap: space[4] }}>
          {playing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] }}>
              <Lock size={size.iconMeta} color={colors.textSoft} strokeWidth={size.iconStroke} />
              <Text variant="metaStrong" color="textSoft">
                {card === '' ? 'Your card, only you see it' : 'Your word, only you see it'}
              </Text>
            </View>
          ) : null}
          {wordBlock()}
          <Text variant="body" color="textSoft" center>
            {!playing
              ? 'You can still talk. You can play from the next game.'
              : card === ''
                ? "Everyone else has a secret word. Listen, and blend in so they don't find you."
                : "Describe it without saying it. One of you doesn't know it."}
          </Text>
          <View style={{ height: border.hairline, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" color="textSoft">
              {footer.left}
            </Text>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: typeScale.heading.fontSize, color: colors.text, fontVariant: ['tabular-nums'] }}>
              {footer.right}
            </Text>
          </View>
        </View>
      )}

      {!outcome && phase.kind === 'speaking' ? (
        <Text variant="meta" color="textMeta" center>
          Voting starts when everyone has spoken
        </Text>
      ) : null}

      {!outcome && phase.kind === 'voting' && playing ? (
        <View style={{ gap: space[2] }}>
          <Text variant="heading">Who's faking it?</Text>
          {round.order
            .filter((id) => id !== me)
            .map((id) => (
              <RadioRow
                key={id}
                title={nameOf(id)}
                selected={myVote === id}
                onPress={() => onVote(id)}
                leading={<Avatar userId={id} nickname={byId.get(id)?.nickname ?? '?'} diameter={size.avatarList} />}
              />
            ))}
          {myVote ? (
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
              <Check size={size.iconMeta} color={colors.textSoft} strokeWidth={size.iconStroke} />
              <Text variant="meta" color="textSoft">
                Vote sent. You can change it until everyone has voted.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
