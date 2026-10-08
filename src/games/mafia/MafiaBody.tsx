import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react-native';
import { RadioRow } from '../../components/Choice';
import { Text } from '../../components/Text';
import { radius, size, space, useColors } from '../../theme';
import type { Person } from '../../voice/useVoiceRoom';
import { GameOver } from '../shared/GameOver';
import type { MafiaMove, MafiaPublic, MafiaSecret, Role } from './engine';

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
  me: string;
  people: Person[];
  starter: boolean;
  onMove: (move: MafiaMove) => void;
  onPlayAgain: () => void;
  onBackToTalking: () => void;
};

// Mafia on the table: your role (only you see it), the night choices, the day vote with counts
// (never who voted for whom), and the narrator's view.
export function MafiaBody({ g, secret, me, people, starter, onMove, onPlayAgain, onBackToTalking }: Props) {
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
  const name = (id: string) => (id === me ? 'You' : people.find((p) => p.id === id)?.nickname ?? g.names[id] ?? 'Someone');
  const living = g.players.filter((p) => !g.out.includes(p));
  const iAmOut = g.out.includes(me);
  const narrator = secret?.role === 'narrator' ? secret : null;
  const player = secret && secret.role !== 'narrator' ? secret : null;
  const night = g.phase === 'night';
  const PhaseIcon = night ? Moon : Sun;

  return (
    <View style={{ gap: space[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <PhaseIcon size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
        <Text variant="heading" style={{ flex: 1 }}>
          {g.phase === 'over' ? 'Game over' : `${night ? 'Night' : 'Day'} ${g.round}`}
        </Text>
        {g.phase !== 'over' ? (
          <Text variant="metaStrong" color="textSoft" style={{ fontVariant: ['tabular-nums'] }}>{`${left}s`}</Text>
        ) : null}
      </View>
      <Text variant="body" color="textSoft" accessibilityLiveRegion="polite">
        {g.last}
      </Text>

      {player ? (
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
              {hidden ? <Eye size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} /> : <EyeOff size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />}
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
      ) : null}

      {narrator && g.phase !== 'over' ? (
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
      ) : null}

      {g.phase === 'over' ? (
        <>
          {g.roles ? (
            <Text variant="meta" color="textSoft">
              {g.players.map((p) => `${name(p)}: ${g.roles?.[p] ? ROLE_NAME[g.roles[p]] : ''}`).join('. ')}
            </Text>
          ) : null}
          <GameOver result={g.winner === 'town' ? 'Town wins' : g.winner === 'mafia' ? 'Mafia wins' : 'Game over'} canRestart={starter} onPlayAgain={onPlayAgain} onBackToTalking={onBackToTalking} />
        </>
      ) : iAmOut ? (
        <Text variant="body" color="textSoft">
          {"You're out of this game. You can still listen, talk and chat."}
        </Text>
      ) : night && player ? (
        player.role === 'town' ? (
          <Text variant="body" color="textSoft">
            Mics are paused for the night. The Mafia is choosing.
          </Text>
        ) : (
          <View style={{ gap: space[2] }}>
            <Text variant="bodyStrong">{NIGHT_ASK[player.role]}</Text>
            <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
              {living
                .filter((p) => (player.role === 'doctor' || p !== me) && !player.partners.includes(p))
                .map((p) => (
                  <RadioRow key={p} title={name(p)} selected={player.myNight === p} onPress={() => onMove({ type: 'night', target: p })} />
                ))}
            </View>
          </View>
        )
      ) : !night && player ? (
        <View style={{ gap: space[2] }}>
          <Text variant="bodyStrong">{`Talk it over, then vote. ${g.voted} of ${living.length} have voted. The result comes at the end of the day.`}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space[1] }}>
            {living
              .filter((p) => p !== me)
              .map((p) => (
                <RadioRow
                  key={p}
                  title={name(p)}
                  selected={player.myVote === p}
                  onPress={() => onMove({ type: 'vote', target: p })}
                />
              ))}
            <RadioRow title="Nobody today" selected={player.myVote === 'skip'} onPress={() => onMove({ type: 'vote', target: 'skip' })} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
