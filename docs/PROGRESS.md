# Circles progress

Claude Code updates this file at the end of every build step. Newest entries at the top.

## Current step

**Steps 2 to 7 built overnight on 2026-10-08, while Sammy slept (he asked for it). Waiting for Sammy's Supabase updates, a new build and the phone test: see `docs/MORNING.md`.**

Still open from Step 1: a test with a friend in another place on their own mobile data (the Lagos mobile-data check, and a proper echo check).

## Decisions made

- Stack: Expo React Native, Supabase, LiveKit Cloud (Agora as backup), Termii for SMS codes. See `CIRCLES_ARCHITECTURE.md`.
- Design: Lamplight (warm dark theme, Nunito, one ember action colour). See `CIRCLES_DESIGN_DIRECTION.md`.
- No tab bar: Home has the doors (see `docs/screens/01-home.png`).
- Sign-up for the open test (5–6 days of public testing): nickname + 18+ question only, email optional, every room open to everyone, no bot check. Sammy will make email and then phone required later. Decided 2026-10-08, after hearing the risks (abusers coming back, vulnerable people in support rooms).
- Block and Report (Step 2b) get built before the open test starts.
- Rooms need 3 people before anyone can talk (rules.roomMinPeople); a live room that drops to 2 gets a 2-minute countdown with mics paused, then closes for those two.
- Every room holds 6 for now, support rooms included (the design allows 10, but the seat circle draws 6, and nobody should be in a room unseen).
- Support rooms only ever run with a trained host. Hosts are rows in the `hosts` table that Sammy adds.
- Ludo is our own code (no outside licence), for two teams (Sun and Sky). Nothing about a game is saved.
- Thank-yous are stored privately; no total is shown to anyone (Never list: no scores). Sammy to decide if anything should show.
- Age: 18+ for launch. A teen or family version may come later, designed separately (teen-only rooms, parent consent, legal check). Decided 2026-10-08.

## Steps done

### Find the Impostor (2026-10-08, Sammy asked for it after Step 7), not yet tested on phones

- Built: the "Play a game" sheet in play rooms (Ludo or Find the Impostor) and the Let's play page to match `docs/screens/10-lets-play.png`. Find the Impostor follows `12-find-the-impostor.png`: the speaking-order row, your secret word card with a timer, Hide word, voting, the reveal with vote counts, and 3 rounds.
- The server deals the cards (`supabase/migrations/20261009020000_impostor.sql`): a Naija word pack, a random impostor and a random speaking order. Each phone can only fetch its own card. The answer is only given once everyone has voted or time is up. Counts are shown per person, never who voted for whom. Rounds and votes are deleted when the game ends, and anything older than two hours is swept away; no scores are kept. Games only start in play rooms (checked on the server).
- Checks: 73 app tests and 30 database checks; screens rendered in a browser and compared with the designs; circles-reviewer (its 4 must-fix findings fixed: Play again on every phone, two people tapping Next round, Hide word giving the impostor away, votes kept after the game).

### Steps 2b to 7 (overnight, 2026-10-08), not yet tested on phones

- **2b Safety:** tap a seat for Save, Block and Report. There are three Report sheets (who, what happened, sent), and "Someone may be in danger" is marked urgent. Block silences the person for the blocker, keeps you out of rooms together, and removes saves both ways (a database trigger). Reports and bans can only be read by Sammy in the dashboard. Banned people get "Your account is paused" or "has been closed".
- **3 Home and rooms:** Home with the support line and four doors. I want to talk has optional moods, Find my room and an Open now list. The room server (`livekit-token`: match, join, list, stats, support, delete_account) puts people in the fullest room with a seat and opens new rooms only when needed, never with someone they blocked.
- **4 Room rules:** waiting ("Nobody's here yet"), live, and a countdown with paused mics when the room drops to 2. Short reconnects don't trigger it. After the room: "Thanks for being there", with private thank-yous, secret saves and "Was everyone kind?". My people lists mutual saves only.
- **5 Support door:** Come in only when a trained host is in a room (or you are one). The help screen opens over the room so voice keeps going, and shows no numbers until Sammy gives verified ones. The lock-screen notification never names the room.
- **6 Ludo:** the I'm bored door, Play now, and Play Ludo in play rooms only. Two teams, the board on the table, with every phone in step through Supabase Realtime. Leave game and End game; Play again.
- **7 Web check:** see below.
- **Also:** Me (Blocked people, Unblock, Log out, Delete my account); delete account removes everything (app stores require it).
- **Checks:** 65 app tests; 17 database checks that run every migration twice on a real Postgres (`npm run test:db`); the room server type-checked with Deno; screens rendered in a browser and compared with `docs/screens/`; the circles-reviewer agent after each step, with its must-fix findings fixed.

### Web check (Step 7)

`npx expo start --web` (or `npx expo export --platform web`) runs the same code in a browser.
- **Works:** every screen renders and looks like the phone version (checked in Chromium). Fonts and icons load, and so do sign-up, Home, the doors, the Report and Block sheets, help, after the room and the Ludo board.
- **Voice in the browser:** it uses LiveKit's web library (`livekit-client`) and plays other people's voices through hidden audio elements. Not yet tried with real people, because this cloud computer can't reach Supabase or LiveKit.
- **Not on web:** there's no lock-screen notification (browsers can't keep voice alive in the background the same way), no haptics, and "Open settings" for the microphone can't open browser settings.
- **Not built yet:** the link-first join page (`docs/screens/16-join-from-a-link.png`) is later work.

### Step 1: Voice works (2026-10-08)

Built: test sign-in (Tolu, Ada_K, Bayo), the room screen (circle of seats, speaking ring, mute and unmute, mic permission sheets, Leave, Cancel while joining), LiveKit voice, the Android "You're in a room" notification, the Supabase function `livekit-token`, and the tables `profiles` and `rooms` with Row Level Security.

Tested by Sammy on a Samsung Galaxy S22 Ultra and a Redmi Pad SE 8.7 (preview build from EAS):
- Both joined the same room and heard each other. No noticeable delay.
- Voice kept going with the screen locked and while using other apps, on both.
- The "You're in a room" notification showed on both, once notifications were allowed on the Samsung.
- LiveKit rated the connection "excellent". Joining was quick, well under 3 seconds.
- With the two devices side by side, the Redmi made a loud building noise (feedback, one device's speaker feeding the other's mic). Lowering the volume stopped it. Expected for devices in the same room; not an app fault.

Setup notes:
- Supabase: anonymous sign-ins on (for test people only), SQL from `supabase/migrations/` run, function `livekit-token` deployed, secrets `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` set.
- Expo: project `@sammychris/circles`. The three public values (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_LIVEKIT_URL`) are stored in EAS for the `development` environment. Build with `npx eas-cli build --profile preview --platform android`.
- The `preview` build runs on its own; the `development` build needs Sammy's computer on the same Wi-Fi, so use `preview` for phone tests.

## Later: email (one of the last things, when Sammy says)

Email is built but switched off (`EMAIL_ENABLED = false` in `src/config.ts`). When Sammy wants it:
1. Supabase › Authentication › Emails: in the templates "Magic Link", "Change Email Address" and "Confirm signup", put the code `{{ .Token }}` in the message (the app asks for a code, not a link).
2. Set up a free email-sending service (custom SMTP) in Supabase. The built-in one only sends to the project team's own addresses, a few an hour.
3. Turn `EMAIL_ENABLED` on, build, test "Add your email" and "I already have an account".
4. Then decide when email (and later phone) becomes required.

## Notes for later steps

- Sammy pasted the LiveKit API secret and the Supabase database password into a chat with Claude. Nothing was saved from them. Reset both on their websites after testing (LiveKit: Settings › Keys, make a new key and update the Supabase secrets; Supabase: Project Settings › Database › Reset password).
- Supabase settings Step 2 relies on: **anonymous sign-ins ON** (open test) and **Confirm email ON**.
- Supabase allows about 30 new anonymous accounts per hour from one internet address. Nigerian mobile networks put many people behind one address, so raise this limit (Authentication › Rate Limits) before publicising the open test.
- During the open test the 18+ question and bans are easy to get around (a new account takes seconds). Sammy accepted this for the test; email and phone checks come later.
- The join-time numbers under the room circle (`SHOW_TEST_NUMBERS` in `src/config.ts`) stay on until the mobile-data test with a friend is done, then turn off before real users.
- Before publicising the open test: Terms and Privacy pages (the Welcome screen mentions them; people give a date of birth and maybe an email).
- Youth helpline: `src/content/helplines.ts` is empty until Sammy gives a real, checked number. Until then the under-18 screen says to talk to a trusted adult. Any EAS build (preview or production) refuses to build while bracketed placeholder text is in `src/`.
- Leftover accounts: people who log out without an email, or tap Back on the 18+ or nickname screen, leave an anonymous account (with its private date of birth) behind. Plan a cleanup, e.g. delete anonymous accounts with no nickname or no email after 30 days.
- Ludo moves travel on a public Supabase Realtime channel named after the room. Someone technical with the app's public key could listen or send fake moves (game only, never voice or accounts). Before a wide launch, switch to private channels with Realtime access rules.
- Ludo team colours are Night-theme only (the app is Night-only for now).
- If LiveKit can't be reached, the room server treats rooms as empty (it can still match people; they just won't connect).
- Not built yet, though they're in the designs: chat in rooms, raise hand, minimise to a room bar, notifications and reminders, Coming up and scheduled rooms, private rooms with friends, Learn together, "Talk with a trained listener", the 10-seat ring, Find the Impostor and the other games, the link-first web join.
- The under-18 lock is per account. With phone checks later it can become per phone number, as `age-check.md` describes.
- Android app id is `com.sammychris.circles`. Change it before the first Play Store build if Sammy wants a different one.
- Listeners (mic not allowed) get a media-type notification; talkers get a microphone-type one. Needs checking on a real phone with the screen locked.

## Open questions for Sammy

- Verified Nigerian crisis line and emergency number for the help screens.
