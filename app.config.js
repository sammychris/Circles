// app.json holds the app's settings. This adds one thing it can't: Firebase's settings file for
// alerts on Android (docs/BUILD_NOTES.md part 20). The file lives on expo.dev as the
// GOOGLE_SERVICES_JSON environment variable, so it never goes into GitHub. Without it the app builds
// as before, just without lock-screen alerts.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
});
