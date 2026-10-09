import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Game sounds (game-mode.md › Sound). Short, quiet, mixed in with the voices (never pausing or
// lowering them), and never the only signal: every sound comes with a line of text or a movement.
// The on/off choice is kept on this phone, and shown in the game's ⋯ menu and in Me.

export type SoundName = 'turn' | 'dice' | 'move' | 'capture' | 'card' | 'market' | 'night' | 'day' | 'won';

const FILES: Record<SoundName, number> = {
  turn: require('../../assets/sounds/turn.wav'),
  dice: require('../../assets/sounds/dice.wav'),
  move: require('../../assets/sounds/move.wav'),
  capture: require('../../assets/sounds/capture.wav'),
  card: require('../../assets/sounds/card.wav'),
  market: require('../../assets/sounds/market.wav'),
  night: require('../../assets/sounds/night.wav'),
  day: require('../../assets/sounds/day.wav'),
  won: require('../../assets/sounds/won.wav'),
};

const KEY = 'circles.sound';
// About 40%, so the sounds sit under the voices.
const VOLUME = 0.4;

let soundOn = true;
let loaded = false;
const listeners = new Set<(on: boolean) => void>();
const players = new Map<SoundName, AudioPlayer>();
let modeSet = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === 'off') setOn(false, false);
  } catch {
    // On by default.
  }
}

function setOn(on: boolean, save = true) {
  soundOn = on;
  listeners.forEach((l) => l(on));
  if (save) void AsyncStorage.setItem(KEY, on ? 'on' : 'off').catch(() => {});
}

export function setSoundOn(on: boolean) {
  setOn(on);
}

// The phone's sound setting, kept in step everywhere it's shown.
export function useSoundSetting(): [boolean, (on: boolean) => void] {
  const [on, setState] = useState(soundOn);
  useEffect(() => {
    void load();
    setState(soundOn);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return [on, setSoundOn];
}

function player(name: SoundName): AudioPlayer | null {
  try {
    let p = players.get(name);
    if (!p) {
      p = createAudioPlayer(FILES[name]);
      p.volume = VOLUME;
      players.set(name, p);
    }
    return p;
  } catch {
    return null;
  }
}

// Plays a sound unless sound is off. (Games only run in play rooms, so Learn rooms, where sound is off
// by default in the design, never play any.)
export function playSound(name: SoundName) {
  if (!soundOn) return;
  if (!modeSet) {
    modeSet = true;
    // Android: no audio focus is asked for, so the room's voices never pause or dip, and the silent
    // switch is followed. iPhone is left alone for now: changing its audio session could stop the
    // voice (check this before the iPhone build).
    if (Platform.OS === 'android') {
      void setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false }).catch(() => {});
    }
  }
  const p = player(name);
  if (!p) return;
  try {
    void p.seekTo(0);
    p.play();
  } catch {
    // A sound that can't play is never a problem: there is always text or movement too.
  }
}
