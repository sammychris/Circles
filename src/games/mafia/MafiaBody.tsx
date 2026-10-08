import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react-native';
import { RadioRow } from '../../components/Choice';
import { CountdownRing } from '../../components/CountdownRing';
import { Text } from '../../components/Text';
import { playSound } from '../../lib/sounds';
import { radius, size, space, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameStage } from '../mode/GameMode';
import { useWinCue } from '../mode/motion';
import { GameOver } from '../shared/GameOver';
import { NIGHT_SECONDS, type MafiaMove, type MafiaPublic, type MafiaSecret, type Role } from './engine';

const ROLE: Record<Role, { title: string; line: string }> = {
  mafia: { title: "You're the Mafia", line: 'At night, pick someone to take out. By day, blend in.' },
  doctor: { title: "You're the Doctor", line: 'At night, pick someone to save. It can be you.' },
  detective: { title: "You're the Detective", line: 'At night, check one person. Only you learn the answer.' },
  town: { title: "You're a Townsperson", line: 'Talk, listen, and vote out the Mafia.' },
};
const ROLE_NAME: Record<Role, string> = { mafia: 'Mafia', doctor: 'Doctor', detective: 'Detective', town: 'Townsperson' };
const NIGHT_ASK: Record<Exclude<Role, 'town'>, string> = {
  mafia: 'Who will the Mafia take out?',
  doctor: 'Who will you save?',
  detective: 'Who will you check?',
};

type Props = {
  g: MafiaPublic;
  secret: MafiaSecret | null;
  gameKey: string;
  me: string;
  people: Person[];
  starter: boolean;
  onMove: (move: MafiaMove, guess?: (g: unknown, secret: unknown) => { secret: unknown } | null) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Mafia in game mode: your role (only you see it, with Hide) by day, and the night choices by night,
// when the screen dims around a moon and the night's countdown. Votes show counts, never who voted
// for whom. Being out is only out of the game: you stay in the room.
export function MafiaBody({ g, secret, gameKey, me, people, starter, onMove, onPlayAgain, onBackToTalking }: Props) {
  const colors = useColors();
  const [hidden, setHidden] = useState(false);
  // Count down on this phone's own clock.
  const endsLocal = useRef(0);
  const sentKey = `${g.sentAt}-${g.endsAt}`;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    endsLocal.current = Date.now() + Math.max(0, g.endsAt - g.sentAt);
    // Only when a new update arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentKey]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((endsLocal.current - now) / 1000));
  const name = (id: string) => (id === me ? 'You' : (people.find((p) => p.id === id)?.nickname ?? g.names[id] ?? 'Someone'));
  const living = g.players.filter((p) => !g.out.includes(p));
  const iAmOut = g.out.includes(me);
  const narrator = secret?.role === 'narrator' ? secret : null;
  const player = secret && secret.role !== 'narrator' ? secret : null;
  const night = g.phase === 'night';
  const over = g.phase === 'over';
  useWinCue(over);

  // Night falls with a low soft tone, day breaks with a light bell.
  const phaseWas = useRef(g.phase);
  useEffect(() => {
    if (g.phase !== phaseWas.current) {
      if (g.phase === 'night') playSound('night');
      else if (g.phase === 'day') playSound('day');
    }
    phaseWas.current = g.phase;
  }, [g.phase]);

  // Your choice shows straight away; the narrator's phone confirms it.
  const choose = (move: MafiaMove) =>
    onMove(move, (_g, current) => {
      const mine = current as MafiaSecret | null;
      if (!mine || mine.role === 'narrator') return null;
      return { secret: move.type === 'vote' ? { ...mine, myVote: move.target } : { ...mine, myNight: move.target } };
    });

  const roleCard = player ? (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4], gap: space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="metaStrong" color="textMeta">
          Only you can see this
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show my role' : 'Hide my role'}
          onPress={() => setHidden((h) => !h)}
          style={{ width: size.iconButton, height: size.iconButton, alignItems: 'center', justifyContent: 'center' }}
        >
          {hidden ? (
            <Eye size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          ) : (
            <EyeOff size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
          )}
        </Pressable>
      </View>
      {hidden ? (
        <Text variant="bodyStrong" color="textMeta">
          Hidden
        </Text>
      ) : (
        <>
          <Text variant="title">{ROLE[player.role].title}</Text>
          <Text variant="meta" color="textSoft">
            {ROLE[player.role].line}
          </Text>
          {player.role === 'mafia' && player.partners.length > 0 ? (
            <Text variant="meta" color="textSoft">
              {`Your partner: ${player.partners.map(name).join(' and ')}. You choose together.`}
            </Text>
          ) : null}
          {player.role === 'detective' && player.checks.length > 0 ? (
            <Text variant="meta" color="textSoft">
              {player.checks.map((c) => `${name(c.target)} ${c.mafia ? 'IS the Mafia' : 'is not the Mafia'}`).join('. ')}
            </Text>
          ) : null}
        </>
      )}
    </View>
  ) : null;

  const narratorCard =
    narrator && !over ? (
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: space[4], gap: space[2] }}>
        <Text variant="metaStrong" color="textMeta">
          {"You're the narrator. Only you see this. Read out what happens."}
        </Text>
        {g.players.map((p) => (
          <Text key={p} variant="meta" color={g.out.includes(p) ? 'textMeta' : 'textSoft'}>
            {`${name(p)}: ${ROLE_NAME[narrator.roles[p]]}${g.out.includes(p) ? ' (out)' : ''}${
              night && Object.values(narrator.night).includes(p)
                ? `. Chosen tonight by the ${Object.entries(narrator.night)
                    .filter(([, t]) => t === p)
                    .map(([r]) => ROLE_NAME[r as Role])
                    .join(' and the ')}`
                : ''
            }`}
          </Text>
        ))}
      </View>
    ) : null;

  let choices = null;
  if (!over && !iAmOut && player) {
    if (night && player.role !== 'town') {
      choices = (
        <View style={{ gap: space[2] }}>
          <Text variant="bodyStrong">{NIGHT_ASK[player.role]}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
            {living
              .filter((p) => (player.role === 'doctor' || p !== me) && !player.partners.includes(p))
              .map((p) => (
                <RadioRow key={p} title={name(p)} selected={player.myNight === p} onPress={() => choose({ type: 'night', target: p })} />
              ))}
          </View>
        </View>
      );
    } else if (!night) {
      choices = (
        <View style={{ gap: space[2] }}>
          <Text variant="bodyStrong">{`Talk it over, then vote. ${g.voted} of ${living.length} have voted.`}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
            {living
              .filter((p) => p !== me)
              .map((p) => (
                <RadioRow key={p} title={name(p)} selected={player.myVote === p} onPress={() => choose({ type: 'vote', target: p })} />
              ))}
            <RadioRow title="Nobody today" selected={player.myVote === 'skip'} onPress={() => choose({ type: 'vote', target: 'skip' })} />
          </View>
        </View>
      );
    }
  }

  const turnText = over
    ? g.winner === 'town'
      ? 'Town wins'
      : g.winner === 'mafia'
        ? 'Mafia wins'
        : 'Game over'
    : `${night ? 'Night' : 'Day'} ${g.round}. ${left} seconds`;

  return (
    <GameStage
      kind="mafia"
      gameKey={gameKey}
      turn={{ text: turnText, Icon: over ? undefined : night ? Moon : Sun }}
      faces={(id) => ({ dim: g.out.includes(id) })}
      night={night}
      won={over}
      board={({ width, height }) => (
        <ScrollView style={{ width, maxHeight: height }} contentContainerStyle={{ gap: space[4], paddingBottom: space[2] }}>
          {night ? (
            <View style={{ alignItems: 'center', gap: space[3] }}>
              <Moon size={size.icon * 2} color={colors.textSoft} strokeWidth={size.iconStroke} />
              <CountdownRing seconds={left} total={NIGHT_SECONDS} caption="until morning" />
            </View>
          ) : null}
          {over ? (
            g.roles ? (
              <Text variant="body" color="textSoft">
                {g.players.map((p) => `${name(p)}: ${g.roles?.[p] ? ROLE_NAME[g.roles[p]] : ''}`).join('. ')}
              </Text>
            ) : null
          ) : iAmOut ? (
            <Text variant="body" color="textSoft">
              {"You're out of this game. You can still listen, talk and chat."}
            </Text>
          ) : night && player?.role === 'town' ? (
            <Text variant="body" color="textSoft" center>
              Mics are paused for the night. The Mafia is choosing.
            </Text>
          ) : null}
          {!night ? roleCard : null}
          {narratorCard}
          {choices}
        </ScrollView>
      )}
      controls={
        over ? (
          <GameOver result={turnText} canRestart={starter} onPlayAgain={onPlayAgain} onBackToTalking={onBackToTalking} />
        ) : (
          <Text variant="meta" color="textSoft" numberOfLines={2}>
            {g.last}
          </Text>
        )
      }
    />
  );
}
