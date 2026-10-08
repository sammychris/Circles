# Circles progress

Claude Code updates this file at the end of every build step. Newest entries at the top.

## Current step

**Step 2 (easy sign-up for the open test): code written and checked, waiting for Sammy's Supabase setup and phone test.** Next: Step 2b (Block, Report, removing someone), which must be done before the open test starts.

Built: Welcome; Get started makes an account straight away (Supabase anonymous account); the 18+ question (with the under-18 stop screen); the nickname screen; optional "Add your email" (same account, keeps the nickname); "I already have an account" signs back in with that email; Log out warns people who have no email that they'll lose the account. The database has a private `birth_dates` table (owner-only, set once) and two server functions (`set_date_of_birth`, `set_nickname`) that enforce the rules. The voice function only gives a ticket to people with a nickname who passed the 18+ question.

Still open from Step 1: a test with a friend in another place on their own mobile data (the Lagos mobile-data check, and a proper echo check).

## Decisions made

- Stack: Expo React Native, Supabase, LiveKit Cloud (Agora as backup), Termii for SMS codes. See `CIRCLES_ARCHITECTURE.md`.
- Design: Lamplight (warm dark theme, Nunito, one ember action colour). See `CIRCLES_DESIGN_DIRECTION.md`.
- No tab bar: Home has the doors (see `docs/screens/01-home.png`).
- Sign-up for the open test (5–6 days of public testing): nickname + 18+ question only, email optional, every room open to everyone, no bot check. Sammy will make email and then phone required later. Decided 2026-10-08, after hearing the risks (abusers coming back, vulnerable people in support rooms).
- Block and Report (Step 2b) get built before the open test starts.
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
- Supabase settings Step 2 relies on: **anonymous sign-ins ON** (open test), **Confirm email ON** (so an added email is really theirs), and the email templates "Magic Link" and "Change Email Address" must include the code (`{{ .Token }}`).
- Supabase allows about 30 new anonymous accounts per hour from one internet address. Nigerian mobile networks put many people behind one address, so raise this limit (Authentication › Rate Limits) before publicising the open test.
- During the open test the 18+ question and bans are easy to get around (a new account takes seconds). Sammy accepted this for the test; email and phone checks come later.
- The join-time numbers under the room circle (`SHOW_TEST_NUMBERS` in `src/config.ts`) stay on until the mobile-data test with a friend is done, then turn off before real users.
- Supabase's built-in email only sends to the project team's own addresses, a few an hour. Before anyone else signs up, set up a free email-sending service (custom SMTP) in Supabase.
- Before publicising the open test: Terms and Privacy pages (the Welcome screen mentions them; people give a date of birth and maybe an email).
- Youth helpline: `src/content/helplines.ts` is empty until Sammy gives a real, checked number. Until then the under-18 screen says to talk to a trusted adult. Any EAS build (preview or production) refuses to build while bracketed placeholder text is in `src/`.
- Leftover accounts: people who log out without an email, or tap Back on the 18+ or nickname screen, leave an anonymous account (with its private date of birth) behind. Plan a cleanup, e.g. delete anonymous accounts with no nickname or no email after 30 days.
- The voice function treats any error from LiveKit's participant list as "room empty" (from Step 1). Fine while LiveKit is up; tighten when capacity matters (Step 3).
- The under-18 lock is per account. With phone checks later it can become per phone number, as `age-check.md` describes.
- Before any real users: a real Report flow and a Block control (CLAUDE.md says both must be reachable in every room; Step 1 only has a Report button that says it isn't built yet). Not on the build plan yet, so Sammy to decide which step.
- Room capacity is enforced by the token function (6 people). Step 3 should read capacity from the `rooms` table everywhere.
- Android app id is `com.sammychris.circles`. Change it before the first Play Store build if Sammy wants a different one.
- Listeners (mic not allowed) get a media-type notification; talkers get a microphone-type one. Needs checking on a real phone with the screen locked.

## Open questions for Sammy

- Verified Nigerian crisis line and emergency number for the help screens.
