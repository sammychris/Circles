import { readFileSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

// Runs the room-picking rules exactly as they are in the Supabase function.
const source = readFileSync(join(__dirname, '..', 'supabase', 'functions', 'livekit-token', 'index.ts'), 'utf8');
const block = source.slice(source.indexOf('// BEGIN MATCHING'), source.indexOf('// END MATCHING'));
const js = ts.transpileModule(`${block}\nmodule.exports = { pickRoom, roomTitle, cleanTitle, customRoomEnded };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod: { exports: Record<string, unknown> } = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);

type Room = { id: string; door: 'talk' | 'play' | 'support'; mood: 'chat' | 'laugh' | 'advice' | null; capacity: number; people: string[]; custom?: boolean };
const pickRoom = mod.exports.pickRoom as (
  rooms: Room[],
  opts: { door: Room['door']; mood: Room['mood']; me: string; avoid: Set<string>; hosts: Set<string>; excludeRoomId?: string },
) => Room | null;
const roomTitle = mod.exports.roomTitle as (door: Room['door'], mood: Room['mood']) => string;
const cleanTitle = mod.exports.cleanTitle as (raw: unknown) => string | null;
const customRoomEnded = mod.exports.customRoomEnded as (room: { custom?: boolean; created_at?: string }, here: number, now?: number) => boolean;

const base = { me: 'me', avoid: new Set<string>(), hosts: new Set<string>() };
const room = (id: string, people: string[], extra: Partial<Room> = {}): Room => ({
  id,
  door: 'talk',
  mood: null,
  capacity: 6,
  people,
  ...extra,
});

describe('pickRoom', () => {
  it('puts new people in the fullest room that still has a seat', () => {
    const rooms = [room('a', ['1']), room('b', ['1', '2', '3']), room('c', ['1', '2', '3', '4', '5', '6'])];
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: null })?.id).toBe('b');
  });

  it('opens a new room only when none fits', () => {
    expect(pickRoom([room('full', ['1', '2', '3', '4', '5', '6'])], { ...base, door: 'talk', mood: null })).toBeNull();
  });

  it('counts a seat you already hold as yours (rejoining)', () => {
    const rooms = [room('a', ['me', '1', '2', '3', '4', '5'])];
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: null })?.id).toBe('a');
  });

  it('matches the mood when one is chosen, any mood when not', () => {
    const rooms = [room('laugh', ['1', '2'], { mood: 'laugh' }), room('advice', ['1'], { mood: 'advice' })];
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: 'advice' })?.id).toBe('advice');
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: null })?.id).toBe('laugh');
  });

  it('treats a talk room with no mood as Just chat', () => {
    expect(pickRoom([room('old', ['1'], { mood: null })], { ...base, door: 'talk', mood: 'chat' })?.id).toBe('old');
    expect(pickRoom([room('old', ['1'], { mood: null })], { ...base, door: 'talk', mood: 'laugh' })).toBeNull();
  });

  it('keeps doors apart', () => {
    expect(pickRoom([room('p', ['1'], { door: 'play' })], { ...base, door: 'talk', mood: null })).toBeNull();
  });

  it('never puts people with someone they blocked, or who blocked them', () => {
    const rooms = [room('a', ['bully', '2', '3']), room('b', ['4'])];
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: null, avoid: new Set(['bully']) })?.id).toBe('b');
  });

  it('skips the room you are being moved out of', () => {
    const rooms = [room('old', ['1', '2']), room('new', ['3'])];
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: null, excludeRoomId: 'old' })?.id).toBe('new');
  });

  it('never an unhosted support room', () => {
    const support = (id: string, people: string[]) => room(id, people, { door: 'support', capacity: 10 });
    const hosts = new Set(['host']);
    expect(pickRoom([support('s', ['1', '2'])], { ...base, door: 'support', mood: null, hosts })).toBeNull();
    expect(pickRoom([support('s', ['host', '1'])], { ...base, door: 'support', mood: null, hosts })?.id).toBe('s');
    // A host can step into a room whose host has left.
    expect(pickRoom([support('s', ['1', '2'])], { ...base, me: 'host', door: 'support', mood: null, hosts })?.id).toBe('s');
  });
});

describe('roomTitle', () => {
  it('names new rooms after the door and mood', () => {
    expect(roomTitle('talk', 'laugh')).toBe('Want to laugh');
    expect(roomTitle('talk', null)).toBe('Just chat');
    expect(roomTitle('support', null)).toBe('Someone to talk to');
  });
});

describe('rooms people start', () => {
  it('are never filled by matching, only found in the list or by link', () => {
    const rooms = [room('mine', ['a', 'b'], { custom: true }), room('plain', ['c'])];
    expect(pickRoom(rooms, { ...base, door: 'talk', mood: null })?.id).toBe('plain');
    expect(pickRoom([rooms[0]], { ...base, door: 'talk', mood: null })).toBeNull();
  });

  it('take plain titles only', () => {
    expect(cleanTitle('  Arsenal   fans  ')).toBe('Arsenal fans');
    expect(cleanTitle('Hi')).toBeNull();
    expect(cleanTitle('x'.repeat(41))).toBeNull();
    expect(cleanTitle('Call me 0803 123 4567')).toBeNull();
    expect(cleanTitle('Join www.example.com')).toBeNull();
    expect(cleanTitle('Free money at scam.ng now')).toBeNull();
    expect(cleanTitle('Follow @someone_here')).toBeNull();
    expect(cleanTitle('Owambe 2026 plans')).toBe('Owambe 2026 plans');
    expect(cleanTitle(42)).toBeNull();
    expect(cleanTitle('Circles official room')).toBeNull();
    expect(cleanTitle('Need someone to talk to')).toBeNull();
  });

  it('end once they have been empty for a while', () => {
    const now = Date.parse('2026-10-08T12:00:00Z');
    const old = { custom: true, created_at: '2026-10-08T11:00:00Z' };
    const fresh = { custom: true, created_at: '2026-10-08T11:55:00Z' };
    expect(customRoomEnded(old, 0, now)).toBe(true);
    expect(customRoomEnded(old, 2, now)).toBe(false);
    expect(customRoomEnded(fresh, 0, now)).toBe(false);
    expect(customRoomEnded({ custom: false, created_at: old.created_at }, 0, now)).toBe(false);
  });
});
