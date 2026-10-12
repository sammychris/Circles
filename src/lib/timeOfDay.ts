// "tonight", from the phone's clock.
export function timeWord(date = new Date()): string {
  const h = date.getHours();
  if (h < 5 || h >= 17) return 'tonight';
  if (h < 12) return 'this morning';
  return 'today';
}

export function peopleInRooms(n: number): string {
  if (n === 0) return '0 people live right now. Be the first in.';
  if (n === 1) return '1 person is in a room right now';
  return `${n} people are in rooms right now`;
}
