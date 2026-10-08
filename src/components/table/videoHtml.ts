import type { VideoRef } from '../../table/model';

// What the player tells the app: ready, and every second where it is and whether it's playing.
export type PlayerEvent = { t: 'ready' } | { t: 'time'; time: number; playing: boolean } | { t: 'error' };
export type PlayerCommand = { c: 'play' } | { c: 'pause' } | { c: 'seek'; to: number } | { c: 'volume'; level: number };

// YouTube requires apps that show its player to say who they are (the HTTP Referer), as the app's id.
export const PLAYER_ORIGIN = 'https://com.sammychris.circles';

// A small page that runs the official YouTube or Vimeo player (nothing is copied or stored) and talks
// to the app through `post` and `window.circlesCommand`. Used inside the phone's web viewer.
export function playerHtml(video: VideoRef): string {
  const id = JSON.stringify(video.id);
  const youtube = `
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
      var player, ready = false;
      function onYouTubeIframeAPIReady() {
        player = new YT.Player('p', {
          width: '100%', height: '100%', videoId: ${id},
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: ${JSON.stringify(PLAYER_ORIGIN)} },
          events: {
            onReady: function () { ready = true; post({ t: 'ready' }); },
            onError: function () { post({ t: 'error' }); },
            onStateChange: function () { tick(); }
          }
        });
      }
      function tick() {
        if (!ready) return;
        post({ t: 'time', time: player.getCurrentTime() || 0, playing: player.getPlayerState() === 1 });
      }
      window.circlesCommand = function (m) {
        if (!ready) return;
        if (m.c === 'play') player.playVideo();
        if (m.c === 'pause') player.pauseVideo();
        if (m.c === 'seek') player.seekTo(m.to, true);
        if (m.c === 'volume') player.setVolume(Math.round(m.level * 100));
      };
    </script>`;
  const vimeo = `
    <iframe id="v" src="https://player.vimeo.com/video/${video.id}?playsinline=1&dnt=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
    <script src="https://player.vimeo.com/api/player.js"></script>
    <script>
      var player = new Vimeo.Player(document.getElementById('v')), ready = false, playing = false, time = 0;
      player.ready().then(function () { ready = true; post({ t: 'ready' }); }).catch(function () { post({ t: 'error' }); });
      player.on('play', function () { playing = true; tick(); });
      player.on('pause', function () { playing = false; tick(); });
      player.on('ended', function () { playing = false; tick(); });
      player.on('timeupdate', function (d) { time = d.seconds; });
      player.on('seeked', function (d) { time = d.seconds; tick(); });
      function tick() { if (ready) post({ t: 'time', time: time, playing: playing }); }
      window.circlesCommand = function (m) {
        if (!ready) return;
        if (m.c === 'play') player.play().catch(function () {});
        if (m.c === 'pause') player.pause().catch(function () {});
        if (m.c === 'seek') player.setCurrentTime(m.to).catch(function () {});
        if (m.c === 'volume') player.setVolume(m.level).catch(function () {});
      };
    </script>`;
  return `<!doctype html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}#p,#v{position:absolute;inset:0;width:100%;height:100%;border:0}</style>
    </head><body>
    <div id="p"></div>
    <script>
      function post(m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
      setInterval(function () { if (typeof tick === 'function') tick(); }, 1000);
    </script>
    ${video.provider === 'youtube' ? youtube : vimeo}
    </body></html>`;
}

export function thumbnailUrl(video: VideoRef): string | null {
  return video.provider === 'youtube' ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : null;
}
