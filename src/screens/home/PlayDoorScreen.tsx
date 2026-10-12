import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Dice5, Search } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { ShowSome } from '../../components/ShowSome';
import { DoorLayout } from '../../components/DoorLayout';
import { Text } from '../../components/Text';
import { RoomRow } from '../../components/RoomRow';
import { GAME_ICON, GAME_TINT } from '../../components/table/PutOnTableSheet';
import { MIN_PLAYERS as IMPOSTOR_MIN, MAX_PLAYERS as IMPOSTOR_MAX } from '../../games/impostor/logic';
import { GAMES } from '../../games/registry';
import type { GameId } from '../../games/tableGame';
import { listOpenRooms, type OpenRoom, type RoomRequest } from '../../rooms/api';
import { doorColors, moodColors, opacity, radius, size, space, useColors } from '../../theme';

type Icon = ComponentType<{ size: number; color: string; strokeWidth: number }>;
type GamePick = GameId | 'ludo' | 'impostor';

// What you do, for someone new; the player count comes from each game.
const DOES: Record<GameId, string> = {
  whot: 'The Naija card game',
  draughts: 'Talk each move over in teams',
  chess: 'Agree each move together',
  mafia: 'Find the Mafia, one of you narrates',
};
const players = (id: GameId) => `${GAMES[id]!.min}–${GAMES[id]!.max} players`;
// Every game, easiest first (Sammy, 2026-10-11). Mafia last: it needs the most people.
const LIST: { id: GamePick; Icon: Icon; tint: { fg: string; bg: string }; name: string; line: string }[] = [
  { id: 'ludo', Icon: Dice5, tint: doorColors.people, name: 'Ludo', line: 'Classic board game in teams · 2 or more' },
  ...(['whot', 'draughts'] as GameId[]).map((id) => ({ id, Icon: GAME_ICON[id], tint: GAME_TINT[id], name: GAMES[id]!.name, line: `${DOES[id]} · ${players(id)}` })),
  { id: 'impostor', Icon: Search, tint: moodColors.laugh, name: 'Find the Impostor', line: `Spot who's bluffing · ${IMPOSTOR_MIN}–${IMPOSTOR_MAX} players` },
  ...(['chess', 'mafia'] as GameId[]).map((id) => ({ id, Icon: GAME_ICON[id], tint: GAME_TINT[id], name: GAMES[id]!.name, line: `${DOES[id]} · ${players(id)}` })),
];

// One row style for every game. Tapping it finds a game room and starts that game there (RoomScreen).
function GameRow({ Icon, tint, name, line, onPress }: { Icon: Icon; tint: { fg: string; bg: string }; name: string; line: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${line}. Finds a game room and starts it.`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.avatarRoom,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <View
        style={{
          width: size.tileIconBox,
          height: size.tileIconBox,
          borderRadius: radius.small,
          backgroundColor: tint.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={size.iconButton20} color={tint.fg} strokeWidth={size.iconStroke} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="bodyStrong">{name}</Text>
        <Text variant="meta" color="textSoft">
          {line}
        </Text>
      </View>
      <ChevronRight size={size.icon} color={colors.textSoft} strokeWidth={size.iconStroke} />
    </Pressable>
  );
}

// "Let's play" (docs/screens/10-lets-play.png, doors.md › I'm bored). Three choices: any game (Play now),
// a game you pick (its row), or your own room (Host a room). Every game is listed.
export function PlayDoorScreen({
  onBack,
  onEnter,
  onStart,
}: {
  onBack: () => void;
  onEnter: (r: RoomRequest) => void;
  onStart: () => void;
}) {
  const playNow = () => onEnter({ kind: 'match', door: 'play', mood: null });
  const play = (game: GamePick) => onEnter({ kind: 'match', door: 'play', mood: null, game });
  // Game rooms with people in them, including ones people started and opened to anyone.
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const load = useCallback(async () => {
    try {
      setRooms(await listOpenRooms('play'));
    } catch {
      // The list is extra: Play now still works.
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);
  return (
    <DoorLayout title="Let's play" line="Games are the excuse. Talking is the fun." onBack={onBack}>
      <View style={{ gap: space[3] }}>
        <Button label="Play now" variant="primary" onPress={playNow} />
        <Text variant="meta" color="textMeta" center>
          Joins any open game
        </Text>
      </View>

      {/* Right under Play now: real people waiting, and the only way into rooms people started
          (matching skips those). */}
      {rooms.length > 0 ? (
        <View style={{ gap: space[2] }}>
          <Text variant="heading">Open now</Text>
          <ShowSome
            items={rooms}
            noun="open rooms"
            render={(room) => <RoomRow key={room.id} room={room} onJoin={() => onEnter({ kind: 'join', roomId: room.id, door: 'play' })} />}
          />
        </View>
      ) : null}

      <View style={{ gap: space[2] }}>
        <Text variant="heading">Games</Text>
        {LIST.map((g) => (
          <GameRow key={g.id} Icon={g.Icon} tint={g.tint} name={g.name} line={g.line} onPress={() => play(g.id)} />
        ))}
      </View>

      <View style={{ gap: space[2] }}>
        <Button label="Host a room" variant="secondary" onPress={onStart} />
        <Text variant="meta" color="textMeta" center>
          Name it, invite friends or anyone, now or later
        </Text>
      </View>
    </DoorLayout>
  );
}
