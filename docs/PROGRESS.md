# Circles progress

Claude Code updates this file at the end of every build step. Newest entries at the top.

## Current step

**Step 2 (real login): code written and checked, waiting for Sammy's Supabase setup and phone test.**

Built: Welcome screen, email and code screens, the 18+ age check (with the under-18 stop screen), the nickname screen, and log out. The database now has a private `birth_dates` table (owner-only, set once) and two server functions (`set_date_of_birth`, `set_nickname`) that enforce the rules. The voice function only gives a ticket to people with a confirmed email, a nickname and 18+. Tests: 28 passing.

Still open from Step 1: a test with a friend in another place on their own mobile data (the Lagos mobile-data check, and a proper echo check).

## Decisions made

- Stack: Expo React Native, Supabase, LiveKit Cloud (Agora as backup), Termii for SMS codes. See `CIRCLES_ARCHITECTURE.md`.
- Design: Lamplight (warm dark theme, Nunito, one ember action colour). See `CIRCLES_DESIGN_DIRECTION.md`.
- No tab bar: Home has the doors (see `docs/screens/01-home.png`).
- Login: email code first, so signing up is easy. Phone verification comes later (bots, ban evasion). Decided 2026-10-08.
- Age: 18+ for launch. A teen or family version may come later, designed separately (teen-only rooms, parent consent, legal check). Decided 2026-10-08.

## Steps done

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

## Notes for later steps

- Sammy pasted the LiveKit API secret and the Supabase database password into a chat with Claude. Nothing was saved from them. Reset both on their websites after testing (LiveKit: Settings › Keys, make a new key and update the Supabase secrets; Supabase: Project Settings › Database › Reset password).
- Supabase settings Step 2 relies on: **Confirm email ON** (otherwise someone could sign up with a made-up email and count as confirmed) and **anonymous sign-ins OFF**. Email templates must include the code (`{{ .Token }}`).
- The join-time numbers under the room circle (`SHOW_TEST_NUMBERS` in `src/config.ts`) stay on until the mobile-data test with a friend is done, then turn off before real users.
- Supabase's built-in email only sends to the project team's own addresses, a few an hour. Before anyone else signs up, set up a free email-sending service (custom SMTP) in Supabase.
- Before real users: Terms and Privacy pages (the Welcome screen mentions them), the verified youth helpline (`src/content/helplines.ts`; production builds refuse to build while the placeholder is there).
- The under-18 lock is per account. With phone checks later it can become per phone number, as `age-check.md` describes.
- Before any real users: a real Report flow and a Block control (CLAUDE.md says both must be reachable in every room; Step 1 only has a Report button that says it isn't built yet). Not on the build plan yet, so Sammy to decide which step.
- Room capacity is enforced by the token function (6 people). Step 3 should read capacity from the `rooms` table everywhere.
- Android app id is `com.sammychris.circles`. Change it before the first Play Store build if Sammy wants a different one.
- Listeners (mic not allowed) get a media-type notification; talkers get a microphone-type one. Needs checking on a real phone with the screen locked.

## Open questions for Sammy

- Verified Nigerian crisis line and emergency number for the help screens.
