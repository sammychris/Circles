import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import type { VideoRef } from '../../table/model';
import { media, radius } from '../../theme';
import type { PlayerCommand, PlayerEvent } from './videoHtml';

export type VideoPlayerHandle = { command: (cmd: PlayerCommand) => void };

type Ctl = { command: (cmd: PlayerCommand) => void; destroy: () => void };

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  const known = scripts.get(src);
  if (known) return known;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('script'));
    document.head.appendChild(el);
  });
  scripts.set(src, p);
  return p;
}

type W = typeof window & {
  YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
  onYouTubeIframeAPIReady?: () => void;
  Vimeo?: { Player: new (el: HTMLElement, opts: unknown) => VimeoPlayer };
};
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(t: number, a: boolean): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};
type VimeoPlayer = {
  ready(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(t: number): Promise<void>;
  setVolume(v: number): Promise<void>;
  on(e: string, f: (d: { seconds: number }) => void): void;
  destroy(): Promise<void>;
};

function youtubeReady(): Promise<void> {
  const w = window as W;
  if (w.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const before = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      before?.();
      resolve();
    };
    void loadScript('https://www.youtube.com/iframe_api');
  });
}

// In a browser the official YouTube or Vimeo player runs straight in the page.
export const VideoPlayer = forwardRef<VideoPlayerHandle, { video: VideoRef; onEvent: (e: PlayerEvent) => void }>(function VideoPlayer(
  { video, onEvent },
  ref,
) {
  const host = useRef<HTMLDivElement | null>(null);
  const ctl = useRef<Ctl | null>(null);
  const emit = useRef(onEvent);
  emit.current = onEvent;
  useImperativeHandle(ref, () => ({ command: (cmd) => ctl.current?.command(cmd) }));

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const mount = document.createElement('div');
    mount.style.width = '100%';
    mount.style.height = '100%';
    el.appendChild(mount);
    if (video.provider === 'youtube') {
      void youtubeReady().then(() => {
        if (stopped) return;
        const w = window as W;
        let ready = false;
        const player = new w.YT!.Player(mount, {
          width: '100%',
          height: '100%',
          videoId: video.id,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              ready = true;
              emit.current({ t: 'ready' });
            },
            onError: () => emit.current({ t: 'error' }),
          },
        });
        const tick = () => ready && emit.current({ t: 'time', time: player.getCurrentTime() || 0, playing: [1, 3].includes(player.getPlayerState()) });
        timer = setInterval(tick, 1000);
        ctl.current = {
          command: (m) => {
            if (!ready) return;
            if (m.c === 'play') player.playVideo();
            if (m.c === 'pause') player.pauseVideo();
            if (m.c === 'seek') player.seekTo(m.to, true);
            if (m.c === 'volume') player.setVolume(Math.round(m.level * 100));
          },
          destroy: () => player.destroy(),
        };
      });
    } else {
      void loadScript('https://player.vimeo.com/api/player.js').then(() => {
        if (stopped) return;
        const w = window as W;
        const player = new w.Vimeo!.Player(mount, { id: Number(video.id), playsinline: true, dnt: true, responsive: true });
        let ready = false;
        let playing = false;
        let time = 0;
        player.ready().then(() => {
          ready = true;
          emit.current({ t: 'ready' });
        }, () => emit.current({ t: 'error' }));
        player.on('play', () => (playing = true));
        player.on('pause', () => (playing = false));
        player.on('ended', () => (playing = false));
        player.on('timeupdate', (d) => (time = d.seconds));
        player.on('seeked', (d) => (time = d.seconds));
        timer = setInterval(() => ready && emit.current({ t: 'time', time, playing }), 1000);
        ctl.current = {
          command: (m) => {
            if (!ready) return;
            if (m.c === 'play') void player.play().catch(() => {});
            if (m.c === 'pause') void player.pause().catch(() => {});
            if (m.c === 'seek') void player.setCurrentTime(m.to).catch(() => {});
            if (m.c === 'volume') void player.setVolume(m.level).catch(() => {});
          },
          destroy: () => void player.destroy().catch(() => {}),
        };
      });
    }
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      ctl.current?.destroy();
      ctl.current = null;
      mount.remove();
    };
  }, [video.provider, video.id]);

  return (
    <View style={{ width: '100%', aspectRatio: media.video, borderRadius: radius.small, overflow: 'hidden' }}>
      <div ref={host} style={{ width: '100%', height: '100%' }} />
    </View>
  );
});
