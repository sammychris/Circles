import * as Updates from 'expo-updates';

// "Version 1.0.0 · updated 8 Oct, 14:05", shown at the bottom of Me, so testers can see that an
// over-the-air update has arrived. The installed app itself shows "as installed".
export function appVersionLine(): string {
  const version = Updates.runtimeVersion || '1.0.0';
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return `Version ${version} · as installed`;
  const at = Updates.createdAt;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return `Version ${version} · updated ${at.getDate()} ${months[at.getMonth()]}, ${time}`;
}
