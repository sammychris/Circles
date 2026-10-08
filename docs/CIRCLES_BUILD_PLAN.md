# Circles — Build Plan

One step at a time. Each step needs Sammy's yes before it starts.
At the end of every step: run all tests, then give Sammy a short phone checklist in plain words (what to tap, what should happen).
Use the existing UI design. Stack and rules are in CIRCLES_ARCHITECTURE.md.

## Step 1 — Voice works (walking skeleton) ← START HERE

Goal: prove live voice is good on Lagos networks before building anything else.

- 3 test accounts (simple test login is fine for this step).
- One voice room, using the existing room screen design.
- Join, leave, mute/unmute, who-is-speaking indicator.
- Voice keeps going with the screen locked and when switching apps.
- Supabase Edge Function that hands out LiveKit tokens.
- Android development build Sammy can install.
- Measure: time to join, and whether speech arrives without noticeable delay.

Decision gate: if voice is laggy or drops on Lagos mobile data, try Agora before Step 2.

Sammy's checklist: 2–3 phones (or friends) join the same room, talk, lock the screen, switch apps, test on mobile data and Wi-Fi.

## Step 2 — Real login

Email code login (Supabase), 18+ age check, choose a nickname, nickname is the only name shown. Phone verification (Supabase + Termii) comes later, to keep out bots and stop banned people returning.

## Step 3 — Finding a room

Room list by mood/topic; new people are placed into existing rooms first; room capacity enforced.

## Step 4 — Room rules

Minimum 3; countdown and close when it drops to 2; leaving and rejoining.

## Step 5 — "I need someone to talk to"

The gentle path from the home screen into a support room, as in the design.

## Step 6 — First game: Ludo

Turns and moves through Supabase Realtime while everyone keeps talking.

## Step 7 — Web check

Same code running in a browser; list what works and what doesn't.

## Later

More games (draughts, chess, Whot, Find the Impostor, Mafia), hosted paid rooms, payments, Circles Plus, the Table.
