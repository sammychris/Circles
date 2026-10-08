// Tells Android that the "You're in a room" notification is a voice service (microphone when you can
// talk, media playback when you only listen), so voice keeps running with the screen locked or while
// another app is open.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withMicForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application[0];
    app.service = app.service || [];
    const name = 'app.notifee.core.ForegroundService';
    app.service = app.service.filter((s) => s.$['android:name'] !== name);
    app.service.push({
      $: {
        'android:name': name,
        'android:foregroundServiceType': 'microphone|mediaPlayback',
        'android:exported': 'false',
        'tools:replace': 'android:foregroundServiceType',
      },
    });
    return cfg;
  });
};
