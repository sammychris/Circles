import { supabase } from '../lib/supabase';
import type { LearnLevel } from './learn';
import type { Topic } from './start';

// Scheduled rooms and weekly groups (supabase/migrations/20261011000000_scheduled_rooms.sql). Only
// counts of who's going are ever shown, never who. Support rooms can never be scheduled.

export type ScheduledRoom = {
  id: string;
  groupId: string | null;
  door: 'talk' | 'play' | 'learn';
  title: string;
  topic: Topic | null;
  language: string | null;
  level: LearnLevel | null;
  capacity: number;
  startsAt: Date;
  private: boolean;
  hostNickname: string | null;
  going: number;
  reminded: boolean;
  regular: boolean;
  mine: boolean;
};

export type Group = {
  id: string;
  name: string;
  door: 'talk' | 'play' | 'learn';
  topic: Topic | null;
  language: string | null;
  level: LearnLevel | null;
  capacity: number;
  days: number[];
  time: string;
  timeZone: string;
  private: boolean;
  hostNickname: string | null;
  regulars: number;
  regular: boolean;
  mine: boolean;
  nextId: string | null;
  nextAt: Date | null;
};

type Row = Record<string, unknown>;

function toRoom(r: Row): ScheduledRoom {
  return {
    id: r.id as string,
    groupId: (r.group_id as string | null) ?? null,
    door: r.door as ScheduledRoom['door'],
    title: r.title as string,
    topic: (r.topic as Topic | null) ?? null,
    language: (r.language as string | null) ?? null,
    level: (r.level as LearnLevel | null) ?? null,
    capacity: Number(r.capacity),
    startsAt: new Date(r.starts_at as string),
    private: !!r.private,
    hostNickname: (r.host_nickname as string | null) ?? null,
    going: Number(r.going ?? 0),
    reminded: !!r.reminded,
    regular: !!r.regular,
    mine: !!r.mine,
  };
}

function toGroup(r: Row): Group {
  return {
    id: r.id as string,
    name: r.name as string,
    door: r.door as Group['door'],
    topic: (r.topic as Topic | null) ?? null,
    language: (r.language as string | null) ?? null,
    level: (r.level as LearnLevel | null) ?? null,
    capacity: Number(r.capacity),
    days: (r.days as number[]) ?? [],
    time: String(r.start_time ?? '00:00').slice(0, 5),
    timeZone: (r.time_zone as string) ?? 'Africa/Lagos',
    private: !!r.private,
    hostNickname: (r.host_nickname as string | null) ?? null,
    regulars: Number(r.regulars ?? 0),
    regular: !!r.regular,
    mine: !!r.mine,
    nextId: (r.next_id as string | null) ?? null,
    nextAt: r.next_starts_at ? new Date(r.next_starts_at as string) : null,
  };
}

// Scheduled rooms (and weekly meetings) from 2 hours ago until `untilMs` from now.
export async function upcomingRooms(untilMs = 8 * 24 * 60 * 60 * 1000): Promise<ScheduledRoom[]> {
  const { data, error } = await supabase.rpc('upcoming_rooms', { p_until: new Date(Date.now() + untilMs).toISOString() });
  if (error) throw error;
  return ((data as Row[]) ?? []).map(toRoom);
}

export async function listGroups(): Promise<Group[]> {
  const { data, error } = await supabase.rpc('list_groups');
  if (error) throw error;
  return ((data as Row[]) ?? []).map(toGroup);
}

export async function setReminder(scheduledId: string, on: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_reminder', { p_scheduled: scheduledId, p_on: on });
  if (error) throw error;
}

export class GroupFullError extends Error {
  constructor() {
    super('This group is full');
  }
}

export async function joinGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('join_group', { p_group: groupId });
  if (error) throw error.message.includes('group_full') ? new GroupFullError() : error;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group: groupId });
  if (error) throw error;
}

export async function endGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('end_group', { p_group: groupId });
  if (error) throw error;
}

export async function cancelScheduled(scheduledId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_scheduled', { p_scheduled: scheduledId });
  if (error) throw error;
}

// Can people go in yet? From 5 minutes before the start until 2 hours after (the room server's rule).
export function canGoIn(at: Date, now = Date.now()): boolean {
  return now >= at.getTime() - 5 * 60_000 && now <= at.getTime() + 2 * 60 * 60_000;
}

// Explore › Tonight: rooms later today; after 9 pm, tomorrow's too. Ones already going are included.
export function tonight(rooms: ScheduledRoom[], now = new Date()): ScheduledRoom[] {
  const end = new Date(now);
  end.setHours(now.getHours() >= 21 ? 47 : 23, 59, 59, 999);
  return rooms.filter((r) => r.startsAt <= end && r.startsAt.getTime() > now.getTime() - 2 * 60 * 60_000);
}
