import { useCallback, useEffect, useState } from 'react';
import { allowReminders, reminderNote, syncReminders } from '../lib/reminders';
import { listGroups, setReminder, upcomingRooms, type Group, type ScheduledRoom } from './schedule';

// Scheduled rooms (and, when asked, weekly groups) for a page, kept fresh every minute. Each load
// also brings this phone's reminders up to date. Remind me flips straight away and undoes itself if
// the server says no.
export function useSchedule(userId: string, withGroups = false) {
  const [rooms, setRooms] = useState<ScheduledRoom[] | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, g] = await Promise.all([upcomingRooms(), withGroups ? listGroups() : Promise.resolve(null)]);
      setRooms(r);
      if (g) setGroups(g);
      setFailed(false);
      void syncReminders(userId, r);
    } catch {
      setFailed(true);
    }
  }, [userId, withGroups]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const flip = (id: string, on: boolean) =>
    setRooms((list) =>
      (list ?? []).map((r) =>
        r.id === id ? { ...r, reminded: on, going: r.regular ? r.going : Math.max(0, r.going + (on ? 1 : -1)) } : r,
      ),
    );

  // Returns a short note for the page to show: done, notifications are off, or it didn't work.
  const toggleReminder = useCallback(
    async (room: ScheduledRoom): Promise<string> => {
      const on = !room.reminded;
      flip(room.id, on);
      try {
        await setReminder(room.id, on);
        const note = on ? reminderNote(await allowReminders()) || 'Reminder set.' : 'Reminder removed.';
        void load();
        return note;
      } catch {
        flip(room.id, !on);
        return "That didn't work. Check that you're online.";
      }
    },
    [load],
  );

  return { rooms, groups, failed, load, toggleReminder };
}
