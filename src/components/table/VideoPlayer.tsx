import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { VideoRef } from '../../table/model';
import { media, radius } from '../../theme';
import { PLAYER_ORIGIN, playerHtml, type PlayerCommand, type PlayerEvent } from './videoHtml';

export type VideoPlayerHandle = { command: (cmd: PlayerCommand) => void };

// Only the players themselves load inside: the page itself, and the official embed frames, matched on
// the exact site. Anything else (a "Watch on YouTube" tap, an advert) opens outside the app.
function allowedInside(raw: string, topFrame: boolean): boolean {
  if (raw === 'about:blank') return true;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (topFrame) return url.origin === PLAYER_ORIGIN;
  const youtube = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(url.hostname);
  if (youtube) return url.pathname.startsWith('/embed/');
  if (url.hostname === 'player.vimeo.com') return url.pathname.startsWith('/video/');
  return false;
}

// The official YouTube or Vimeo player in the phone's web viewer.
export const VideoPlayer = forwardRef<VideoPlayerHandle, { video: VideoRef; onEvent: (e: PlayerEvent) => void }>(function VideoPlayer(
  { video, onEvent },
  ref,
) {
  const web = useRef<WebView>(null);
  const { provider, id } = video;
  const html = useMemo(() => playerHtml({ provider, id }), [provider, id]);
  useImperativeHandle(ref, () => ({
    command: (cmd) => web.current?.injectJavaScript(`window.circlesCommand && window.circlesCommand(${JSON.stringify(cmd)}); true;`),
  }));
  return (
    <View style={{ width: '100%', aspectRatio: media.video, borderRadius: radius.small, overflow: 'hidden' }}>
      <WebView
        ref={web}
        source={{ html, baseUrl: PLAYER_ORIGIN }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          const top = req.isTopFrame !== false;
          if (allowedInside(req.url, top)) return true;
          if (top && /^https?:\/\//.test(req.url)) void Linking.openURL(req.url).catch(() => {});
          return false;
        }}
        onMessage={(e) => {
          try {
            onEvent(JSON.parse(e.nativeEvent.data) as PlayerEvent);
          } catch {
            // not ours
          }
        }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
});
