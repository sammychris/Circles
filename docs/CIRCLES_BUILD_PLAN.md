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

## Phase 2 — Hosts, listeners and teachers (Sammy, 9 October 2026)

Full plan: `docs/design/pages/hosts-and-listeners.md`. One step at a time, each with Sammy's yes first. Steps H1 to H6 need no payments.

- **Before H1:** the phone test of everything built so far, plus the small group-page fixes (Report group first).
- **H1. Becoming a host:** Me › Help others › Become a host, the host guide, the "what would you do?" quiz, three written answers, and an approval list for Sammy. Approved hosts get the Host chip and can host support rooms.
- **H2. Hosts schedule support groups:** once or weekly. They're listed only in the support door, never in Explore, and their reminders never name the room.
- **H3. The host's own record:** sessions hosted and thank-yous, private to the host and Sammy, with progress towards becoming a listener.
- **H4. Listeners and free one-on-one:** Sammy approves listeners. "Talk one-on-one" on a listener's card (who taps it stays private), the listener's times, and a two-person support room with a free time limit. Contact details are blocked in chat, and "Asked me to pay outside Circles" is a report reason.
- **H5. Reviews:** after one-on-one sessions (later also classes), shown only as kind summaries.
- **H6. Teaching on the Table:** slides, a pointer, and a pen.
- **H7. Payments (when Sammy decides):** Paystack or similar, paid one-on-one beyond the free part, paid classes and sessions, earnings and payouts. Needs a business account and a legal check on paid support first.
- **H8. "Become a host" in the app and in marketing:** help people, grow your name, earn when you're ready.

## Later

More games (Draw and Guess, Ayo, Finish the Line, Story Chain, On the Same Wave), Circles Plus, iPhone build, installable web version.
