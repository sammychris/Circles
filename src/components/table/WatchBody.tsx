import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Headphones, Play } from 'lucide-react-native';
import { videoPositionNow, type TableItem, type TableState } from '../../table/model';
import { media, radius, size, space, useColors } from '../../theme';
import { TableAction } from '../TableAction';
import { Text } from '../Text';
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer';
import type { PlayerEvent } from './videoHtml';

// How far a viewer can drift before we bring them back to the presenter's moment.
const DRIFT_SECONDS = 3;
// Our own play, pause and seek commands echo back from the player for a moment; they don't count as
// the viewer choosing to look back.
const ECHO_MS = 2500;
// The presenter repeats where they are this often, so everyone stays together.
const HEARTBEAT_MS = 5000;

type Props = {
  item: Extract<TableItem, { kind: 'video' }>;
  state: TableState;
  mine: boolean;
  // Someone else in the room is talking: the video goes quieter.
  othersTalking: boolean;
  onPresent: (change: Omit<TableState, 'seq'>) => void;
};

// Watch together: the presenter plays, pauses and skips for everyone. Anyone can look back on their
// own phone, then tap "Back to live" to catch up.
export function WatchBody({ item, state, mine, othersTalking, onPresent }: Props) {
  const colors = useColors();
  // Video uses a lot of data, so it only loads when each person taps (the presenter's loads straight away).
  const [loaded, setLoaded] = useState(mine);
  const [following, setFollowing] = useState(true);
  const [failed, setFailed] = useState(false);
  const player = useRef<VideoPlayerHandle>(null);
  const local = useRef({ time: 0, playing: false, ready: false });
  const lastCommand = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const command = (cmd: Parameters<VideoPlayerHandle['command']>[0]) => {
    lastCommand.current = Date.now();
    player.current?.command(cmd);
  };

  // Viewers: follow the presenter's moment.
  const syncToPresenter = () => {
    if (mine || !local.current.ready) return;
    const s = stateRef.current;
    const target = videoPositionNow(s, Date.now());
    if (Math.abs(local.current.time - target) > DRIFT_SECONDS) command({ c: 'seek', to: target });
    if (s.playing && !local.current.playing) command({ c: 'play' });
    if (!s.playing && local.current.playing) command({ c: 'pause' });
  };

  useEffect(() => {
    if (following) syncToPresenter();
    // Runs on every update from the presenter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seq, following]);

  // Presenter: keep telling everyone where the video is.
  useEffect(() => {
    if (!mine) return;
    const timer = setInterval(() => {
      if (local.current.ready && local.current.playing) onPresent({ playing: true, position: local.current.time, sentAt: Date.now() });
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [mine, onPresent]);

  useEffect(() => {
    command({ c: 'volume', level: othersTalking ? 0.3 : 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [othersTalking, loaded]);

  const onEvent = (e: PlayerEvent) => {
    if (e.t === 'error') {
      setFailed(true);
      return;
    }
    if (e.t === 'ready') {
      local.current.ready = true;
      command({ c: 'volume', level: othersTalking ? 0.3 : 1 });
      if (!mine) syncToPresenter();
      return;
    }
    const before = local.current;
    local.current = { time: e.time, playing: e.playing, ready: true };
    const ours = Date.now() - lastCommand.current < ECHO_MS;
    const jumped = Math.abs(e.time - before.time) > DRIFT_SECONDS;
    const toggled = e.playing !== before.playing;
    if (mine) {
      // The presenter used the player's own buttons: everyone follows.
      if (!ours && (toggled || jumped)) onPresent({ playing: e.playing, position: e.time, sentAt: Date.now() });
      return;
    }
    // A viewer paused, rewound or skipped on their own: they're looking back.
    if (following && !ours && (toggled || jumped)) {
      const target = videoPositionNow(stateRef.current, Date.now());
      if (Math.abs(e.time - target) > DRIFT_SECONDS || e.playing !== !!stateRef.current.playing) setFollowing(false);
    }
  };

  return (
    <View style={{ gap: space[3] }}>
      {item.title ? <Text variant="heading">{item.title}</Text> : null}
      {failed ? (
        <Text variant="body" color="textSoft">
          This video can't be shown here. It may be private, age-restricted, or not allowed outside its own site.
        </Text>
      ) : loaded ? (
        <VideoPlayer ref={player} video={item.video} onEvent={onEvent} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tap to watch. Uses mobile data"
          onPress={() => setLoaded(true)}
          style={{ width: '100%', aspectRatio: media.video, borderRadius: radius.small, overflow: 'hidden', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ backgroundColor: colors.scrim, borderRadius: radius.pill, paddingHorizontal: space[4], minHeight: size.minTarget, flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Play size={size.icon} color={colors.text} strokeWidth={size.iconStroke} />
            <Text variant="bodyStrong">Tap to watch</Text>
          </View>
        </Pressable>
      )}
      {!mine && loaded && !following ? (
        <TableAction label="Back to live" onPress={() => setFollowing(true)} />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Headphones size={size.iconMeta} color={colors.textMeta} strokeWidth={size.iconStroke} />
        <Text variant="meta" color="textMeta" style={{ flex: 1 }}>
          {mine
            ? 'You play and pause for everyone. Headphones stop the sound echoing into the room.'
            : following
              ? 'Following along. Headphones stop the sound echoing into the room.'
              : 'You’re looking back on your own.'}
        </Text>
      </View>
    </View>
  );
}
