import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { VideoRef } from '../../table/model';
import { radius } from '../../theme';
import { PLAYER_ORIGIN, playerHtml, type PlayerCommand, type PlayerEvent } from './videoHtml';

export type VideoPlayerHandle = { command: (cmd: PlayerCommand) => void };

// Only the players themselves load inside; anything else (a "Watch on YouTube" tap) opens outside the app.
const ALLOWED = /^(about:blank|https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|ytimg\.com|i\.ytimg\.com|player\.vimeo\.com|f\.vimeocdn\.com|vimeo\.com)|https:\/\/com\.sammychris\.circles)/;

// The official YouTube or Vimeo player in the phone's web viewer.
export const VideoPlayer = forwardRef<VideoPlayerHandle, { video: VideoRef; onEvent: (e: PlayerEvent) => void }>(function VideoPlayer(
  { video, onEvent },
  ref,
) {
  const web = useRef<WebView>(null);
  const html = useMemo(() => playerHtml(video), [video]);
  useImperativeHandle(ref, () => ({
    command: (cmd) => web.current?.injectJavaScript(`window.circlesCommand && window.circlesCommand(${JSON.stringify(cmd)}); true;`),
  }));
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.small, overflow: 'hidden' }}>
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
          if (ALLOWED.test(req.url) || req.url.startsWith('data:')) return true;
          if (req.isTopFrame !== false) void Linking.openURL(req.url).catch(() => {});
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
