import { Pressable, ScrollView, View } from 'react-native';
import { Check, Eye, EyeOff, Lock } from 'lucide-react-native';
import { Avatar } from '../../components/Avatar';
import { RadioRow } from '../../components/Choice';
import { TableAction } from '../../components/TableAction';
import { Text } from '../../components/Text';
import { clock } from '../../rooms/phase';
import { radius, size, space, tableCard, type as typeScale, useColors } from '../../theme';
import { GameStage } from '../mode/GameMode';
import { useTurnCue, useWinCue } from '../mode/motion';
import { GameOver } from '../shared/GameOver';
import { ROUNDS_PER_GAME, caught, phaseAt, seatState, type ImpostorRound, type Result } from './logic';

type Person = { id: string; nickname: string; isMe: boolean; isSpeaking: boolean; isMuted: boolean };

type Props = {
  round: ImpostorRound;
  now: number;
  me: string;
  people: Person[];
  playing: boolean;
  card: string | null; // null while loading, '' for the impostor
  hidden: boolean;
  onShowWord: () => void;
  onHideWord: () => void;
  myVote: string | null;
  outcome: Result | null;
  onVote: (target: string) => void;
  onNextRound: () => void;
  // Play again is for whoever started the game (or anyone, once they've left).
  starter: boolean;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
  busy: boolean;
};

// Find the Impostor in game mode (docs/screens/12-find-the-impostor.png, play.md): the word card large in
// the middle, and the speaking order in the face strip (done, talking, you're next).
export function ImpostorTable({
  round,
  now,
  me,
  people,
  playing,
  card,
  hidden,
  onShowWord,
  onHideWord,
  myVote,
  outcome,
  onVote,
  onNextRound,
  starter,
  onPlayAgain,
  onBackToTalking,
  busy,
}: Props) {
  const colors = useColors();
  const phase = phaseAt(round, now);
  const cardStyle = {
    backgroundColor: colors.raised,
    borderRadius: radius.card,
    padding: space[5],
    shadowColor: colors.ember,
    shadowOpacity: tableCard.shadowOpacity,
    shadowRadius: tableCard.shadowRadius,
    shadowOffset: { width: 0, height: 0 },
    elevation: tableCard.elevation,
  } as const;
  const byId = new Map(people.map((p) => [p.id, p]));
  const nameOf = (id: string) => (id === me ? 'You' : (byId.get(id)?.nickname ?? 'Someone who left'));
  const speaking = !outcome && phase.kind === 'speaking';
  useTurnCue(speaking && phase.kind === 'speaking' && phase.speaker === me);
  const gameDone = !!outcome && round.number >= ROUNDS_PER_GAME;
  useWinCue(gameDone);

  const turnText = outcome
    ? `Round ${round.number} of ${ROUNDS_PER_GAME} is over`
    : phase.kind === 'speaking'
      ? phase.speaker === me
        ? "You're talking"
        : `${nameOf(phase.speaker)} is talking`
      : 'Time to vote';
  const turnClock = outcome ? undefined : clock(phase.secondsLeft);

  const wordBlock = () => {
    if (!playing) {
      return (
        <Text variant="title" center>
          {"You're watching this round"}
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
          {"You're the impostor."}
        </Text>
      );
    }
    return (
      <Text
        style={{ ...typeScale.giant, color: colors.text, textAlign: 'center' }}
        accessibilityRole="header"
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {card}
      </Text>
    );
  };

  const counts = new Map((outcome?.counts ?? []).map((c) => [c.target, c.votes]));

  return (
    <GameStage
      kind="impostor"
      gameKey={round.gameId}
      turn={{ text: turnText, clock: turnClock, mine: speaking && phase.kind === 'speaking' && phase.speaker === me }}
      faces={(id) => {
        if (!round.order.includes(id)) return { dim: true };
        if (outcome || phase.kind === 'voting') return {};
        const state = seatState(round, phase, id);
        return { order: state === 'waiting' ? null : state };
      }}
      won={gameDone}
      board={({ width, height }) =>
        outcome ? (
          <ScrollView style={{ width, maxHeight: height }} contentContainerStyle={{ ...cardStyle, gap: space[3] }}>
            <View accessibilityLiveRegion="polite" style={{ gap: space[2] }}>
              <Text variant="title" center>
                {`${nameOf(outcome.impostor)} ${outcome.impostor === me ? 'were' : 'was'} the impostor`}
              </Text>
              <Text variant="body" color="textSoft" center>
                {`The word was ${outcome.word}. ${caught(outcome) ? 'The room found them.' : 'They blended in.'}`}
              </Text>
            </View>
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
            <Text variant="meta" color="textMeta" center>
              Votes only count for the game. Nobody leaves the room, and nothing is kept.
            </Text>
          </ScrollView>
        ) : phase.kind === 'voting' && playing ? (
          <ScrollView style={{ width, maxHeight: height }} contentContainerStyle={{ gap: space[2] }}>
            <Text variant="heading" accessibilityRole="header">
              {"Who's faking it?"}
            </Text>
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
          </ScrollView>
        ) : (
          <View style={{ ...cardStyle, width, gap: space[4] }}>
            {playing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] }}>
                <Lock size={size.iconMeta} color={colors.textSoft} strokeWidth={size.iconStroke} />
                <Text variant="metaStrong" color="textSoft">
                  {/* The same words for everyone while hidden, so nobody nearby can tell who the impostor is. */}
                  {hidden || card !== '' ? 'Your word, only you see it' : 'Your card, only you see it'}
                </Text>
              </View>
            ) : null}
            {wordBlock()}
            <Text variant="body" color="textSoft" center>
              {!playing
                ? 'You can still talk. You can play from the next game.'
                : hidden
                  ? 'Tap above when nobody can see your screen.'
                  : card === ''
                    ? 'Listen and blend in.'
                    : "Describe it without saying it. One of you doesn't know it."}
            </Text>
          </View>
        )
      }
      controls={
        outcome ? (
          round.number < ROUNDS_PER_GAME ? (
            <TableAction label={busy ? 'Dealing…' : 'Next round'} disabled={busy} onPress={onNextRound} />
          ) : (
            <GameOver
              result="That was the last round"
              canRestart={starter && !busy}
              onPlayAgain={onPlayAgain}
              onBackToTalking={onBackToTalking}
            />
          )
        ) : speaking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
              Voting starts when everyone has spoken
            </Text>
            {playing && card !== null ? (
              <Pressable
                accessibilityRole="button"
                onPress={hidden ? onShowWord : onHideWord}
                style={{ minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[2] }}
              >
                {hidden ? (
                  <Eye size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
                ) : (
                  <EyeOff size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
                )}
                <Text variant="bodyStrong" color="textSoft">
                  {hidden ? 'Show word' : 'Hide word'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null
      }
    />
  );
}
