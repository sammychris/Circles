import * as Updates from 'expo-updates';

// "Version 1.0.0, updated 8 Oct, 2:05 pm", shown at the bottom of Me, so testers can see that an
// over-the-air update has arrived. The installed app itself shows "as installed".
export function appVersionLine(): string {
  const version = Updates.runtimeVersion || '1.0.0';
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return `Version ${version}, as installed`;
  const at = Updates.createdAt;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hour = at.getHours() % 12 || 12;
  const time = `${hour}:${String(at.getMinutes()).padStart(2, '0')} ${at.getHours() < 12 ? 'am' : 'pm'}`;
  return `Version ${version}, updated ${at.getDate()} ${months[at.getMonth()]}, ${time}`;
}
