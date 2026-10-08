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

## Step 2 — Easy sign-up (open test)

Get started → 18+ question → choose a nickname → in. Email is optional ("Add your email" keeps the account if you change phones); people who added one can sign back in with an email code. Nickname is the only name shown. Every room is open to everyone during the open test. Email, then phone (Supabase + Termii), become required later, when Sammy decides.

## Step 2b — Safety basics

Block and Report on every person in a room. Reports go to a list only Sammy can see. Sammy can remove someone from the app.

## Step 3 — Finding a room

Room list by mood/topic; new people are placed into existing rooms first; room capacity enforced.

## Step 4 — Room rules

Support rooms need 3, every other room goes live at 2 (one person can wait in it); countdown and close when it drops below that; leaving and rejoining.

## Step 5 — "I need someone to talk to"

The gentle path from the home screen into a support room, as in the design.

## Step 6 — First game: Ludo

Turns and moves through Supabase Realtime while everyone keeps talking.

## Step 7 — Web check

Same code running in a browser; list what works and what doesn't.

## Later

More games (draughts, chess, Whot, Find the Impostor, Mafia), hosted paid rooms, payments, Circles Plus, the Table.
