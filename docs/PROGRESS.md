# Circles progress

Claude Code updates this file at the end of every build step. Newest entries at the top.

## Current step

**Step 1 (voice works): code written and checked, waiting for Sammy's setup and phone test.**

Done: empty Expo project; Lamplight theme from `tokens.json`; test sign-in (3 test people); the room screen with the circle of seats, speaking ring, mute/unmute, microphone permission sheets, Leave; LiveKit voice with an Android "You're in a room" notification so voice keeps going when the screen is locked; Supabase function `livekit-token` and tables `profiles` and `rooms` with Row Level Security; unit tests (16 passing), type check clean, Android bundle builds.

Still to do for Step 1 (needs Sammy): create Supabase and LiveKit keys, deploy the function, make the Android development build with EAS, install on phones, run the phone checklist, note join times and whether voice is laggy on Lagos mobile data.

## Decisions made

- Stack: Expo React Native, Supabase, LiveKit Cloud (Agora as backup), Termii for SMS codes. See `CIRCLES_ARCHITECTURE.md`.
- Design: Lamplight (warm dark theme, Nunito, one ember action colour). See `CIRCLES_DESIGN_DIRECTION.md`.
- No tab bar: Home has the doors (see `docs/screens/01-home.png`).

## Steps done

(none finished yet)

## Notes for later steps

- Test-only parts to remove when real login arrives (Step 2): the three test people on `LoginScreen`, "Switch test person" on `RoomScreen`, the join-time numbers (`SHOW_TEST_NUMBERS` in `src/config.ts`), and anonymous sign-in in Supabase.
- Before any real users: a real Report flow and a Block control (CLAUDE.md says both must be reachable in every room; Step 1 only has a Report button that says it isn't built yet). Not on the build plan yet, so Sammy to decide which step.
- Room capacity is enforced by the token function (6 people). Step 3 should read capacity from the `rooms` table everywhere.
- Android app id is `com.sammychris.circles`. Change it before the first Play Store build if Sammy wants a different one.
- Listeners (mic not allowed) get a media-type notification; talkers get a microphone-type one. Needs checking on a real phone with the screen locked.

## Open questions for Sammy

- Verified Nigerian crisis line and emergency number for the help screens.
- Age limit: 18 and over (assumed in the designs).
