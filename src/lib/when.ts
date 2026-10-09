// Times in plain words (design direction › Voice and copy): "9 pm", "Tonight at 9 pm", "Friday at
// 10 pm", "In 25 min", "Every Tuesday and Thursday at 7 pm". Always in the phone's own time.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "9 pm", "9:30 pm": lower-case am/pm, minutes only when needed.
export function clockWords(at: Date): string {
  const h = at.getHours();
  const m = at.getMinutes();
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

function dayDiff(at: Date, now: Date): number {
  const a = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
}

// "Tonight at 9 pm", "Today at 3 pm", "Tomorrow at 8 am", "Friday at 10 pm", "Fri 16 Oct at 10 pm".
export function dayAndTime(at: Date, now = new Date()): string {
  const days = dayDiff(at, now);
  const time = clockWords(at);
  if (days === 0) return `${at.getHours() >= 17 ? 'Tonight' : 'Today'} at ${time}`;
  if (days === 1) return `Tomorrow at ${time}`;
  if (days > 1 && days < 7) return `${DAYS[at.getDay()]} at ${time}`;
  return `${DAYS[at.getDay()].slice(0, 3)} ${at.getDate()} ${MONTHS[at.getMonth()]} at ${time}`;
}

// "In 25 min", "In 2 hours", "Now" (from its start, for 2 hours), "Ended".
export function inWords(at: Date, now = new Date()): string {
  const mins = Math.round((at.getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return mins > -120 ? 'Now' : 'Ended';
  if (mins < 60) return `In ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `In ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = dayDiff(at, now);
  return `In ${days} ${days === 1 ? 'day' : 'days'}`;
}

// "Every Friday at 10 pm", "Every Tuesday and Thursday at 7 pm", "Every day at 7 pm". `time` is
// "HH:MM" in the group's time zone; shown as written (most groups and people are in Lagos).
export function weeklyWords(days: number[], time: string): string {
  const [h, m] = time.split(':').map(Number);
  const clock = clockWords(new Date(2026, 0, 1, h, m));
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (sorted.length === 7) return `Every day at ${clock}`;
  if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) return `Every weekday at ${clock}`;
  const names = sorted.map((d) => DAYS[d]);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Every ${list} at ${clock}`;
}

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Monday first, as people in Nigeria read a week.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
