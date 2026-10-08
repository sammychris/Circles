# Makes the game sounds in assets/sounds/ (game-mode.md › Sound). They are generated here from plain
# tones and noise, so they belong to Circles and carry no licence. Run: python3 scripts/make-sounds.py
# Each one is under a second, mono, 22 kHz.
import os
import wave

import numpy as np

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def env(length, attack, decay):
    x = np.arange(length) / RATE
    a = np.minimum(1, x / max(attack, 1e-4))
    return a * np.exp(-x / decay)


def lowpass(x, cutoff):
    # One-pole filter: softens noise into a wooden or papery sound.
    k = np.exp(-2 * np.pi * cutoff / RATE)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - k) * v + k * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def tone(freq, seconds, attack=0.005, decay=0.3, partials=((1, 1.0), (2, 0.25), (3, 0.08))):
    x = t(seconds)
    s = sum(amp * np.sin(2 * np.pi * freq * mult * x) for mult, amp in partials)
    return s * env(len(x), attack, decay)


def place(total, parts):
    out = np.zeros(int(RATE * total))
    for start, sound in parts:
        i = int(RATE * start)
        n = min(len(sound), len(out) - i)
        out[i : i + n] += sound[:n]
    return out


def click(seconds=0.07, pitch=750, cutoff=2600, body=0.6):
    x = t(seconds)
    noise = lowpass(rng.standard_normal(len(x)), cutoff) * env(len(x), 0.0005, 0.012)
    knock = np.sin(2 * np.pi * pitch * x) * env(len(x), 0.0005, 0.02) * body
    return noise + knock


def save(name, samples, peak=0.5):
    samples = samples / max(1e-9, np.max(np.abs(samples))) * peak
    # A 5 ms fade at each end, so nothing pops.
    fade = int(RATE * 0.005)
    samples[:fade] *= np.linspace(0, 1, fade)
    samples[-fade:] *= np.linspace(1, 0, fade)
    data = (samples * 32767).astype('<i2').tobytes()
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(data)


os.makedirs(OUT, exist_ok=True)

# Your turn: a soft two-note chime.
save('turn', place(0.7, [(0, tone(659.25, 0.5, 0.01, 0.18)), (0.14, tone(880, 0.55, 0.01, 0.22))]), 0.45)

# Dice roll: a short rattle of small knocks, slowing down.
times = [0, 0.05, 0.11, 0.16, 0.24, 0.31, 0.41, 0.52]
save('dice', place(0.6, [(s, click(0.05, 900 + 300 * rng.random(), 3500, 0.4) * (1 - i * 0.07)) for i, s in enumerate(times)]), 0.5)

# A piece moves: a light wooden click.
save('move', click(0.08, 700, 2400, 0.7), 0.45)

# Capture: a firmer clack (two knocks close together).
save('capture', place(0.16, [(0, click(0.1, 480, 1800, 1.0)), (0.025, click(0.1, 620, 2200, 0.6))]), 0.6)

# A card is played: a short slap.
x = t(0.12)
save('card', highpass(rng.standard_normal(len(x)), 900) * env(len(x), 0.001, 0.025), 0.5)

# Going to market: a card sliding.
x = t(0.35)
slide = lowpass(highpass(rng.standard_normal(len(x)), 600), 4000) * np.sin(np.pi * np.arange(len(x)) / len(x)) ** 2
save('market', slide, 0.4)

# Mafia: night falls (a low soft tone), day breaks (a light bell).
save('night', tone(196, 0.9, 0.12, 0.45, ((1, 1.0), (2, 0.15))), 0.45)
save('day', tone(1318.5, 0.9, 0.003, 0.3, ((1, 1.0), (2.76, 0.2), (5.4, 0.06))), 0.4)

# Game won: a short warm chord.
chord = sum(tone(f, 0.95, 0.03, 0.5, ((1, 1.0), (2, 0.2))) for f in (261.63, 329.63, 392.0, 523.25))
save('won', chord, 0.5)
