# Circles: what's next

The to-do list for the next Claude Code session. Read it after `docs/PROGRESS.md`.
Last updated 2026-10-08.

Everything up to here is built, reviewed by `circles-reviewer`, and pushed to
`claude/gallant-faraday-7s2l1w`, and carried on in `claude/dreamy-meitner-mjoykp`. None of it has been tested on phones yet.

---

## 1. Done: how many people a room needs

**Before this change:** every room needed 3 people before mics turned on. If a room dropped to 2, a 2-minute countdown started and then the room closed.

**Sammy's idea (2026-10-08):** only "I need someone to talk to" rooms need 3, because that's where kind people gather. Other rooms can start with 2, maybe even 1.

**Claude's recommendation:**

| Room | Mics turn on at | Countdown starts when it drops to | Why |
|---|---|---|---|
| Support ("I need someone to talk to") | 3 (and a trained host, where that rule applies, as now) | 2 | Someone who is down is never alone with one stranger. Kindness comes from more than one person. |
| Talk, Play, Learn | 2 | 1 | Two people can talk. New people go to existing rooms first, so a room of 2 fills up quickly. |
| My people (rooms with friends) | 2 | 1 | Two friends calling each other is normal. |

- **One person can start any room and wait in it.** It says "Waiting for someone to join". It goes live when the second person arrives (the third, in support rooms).
- **Countdown:** the same 2 minutes as now. When it drops to one person, a short countdown runs, then the room closes.
- **Games are unchanged.** Each game already has its own minimum (Draughts 2, Whot 2, Mafia 5).
- **Safety in rooms of 2 stays the same:** Block and Report remain on every person.

**Status: built (2026-10-08), not yet tested on phones.** Support rooms need 3. Every other room can start with 1 waiting and goes live at 2. The game list now says "Needs at least N people" for games a room is too small for (Find the Impostor 3, Mafia 5). The room server already fills the fullest room first, so it needed no change.

**Where it lives in the code and docs** (update all of them together):
- Rule and logic:
  - `src/rooms/phase.ts`: `roomPhase` uses one minimum for every room. It needs a minimum per room type: support 3, others 2.
  - `src/theme/tokens.ts` (`rules.roomMinPeople`) and `docs/design/tokens.json` (`roomMinPeople`).
- Wording:
  - `src/screens/RoomScreen.tsx` ("Rooms need three people", "Finding a third person").
  - `src/components/MicControl.tsx`, `src/screens/StartScreen.tsx`, `src/screens/home/PlayDoorScreen.tsx`, `src/components/table/PutOnTableSheet.tsx`, `src/rooms/start.ts`.
- Tests: `__tests__/phase.test.ts`.
- Product docs:
  - `docs/CIRCLES_ARCHITECTURE.md` (Room rules: "Minimum 3 people…")
  - `docs/CIRCLES_BUILD_PLAN.md` (Step 4)
  - `docs/CIRCLES_DESIGN_DIRECTION.md`
  - `docs/design/pages/starting-soon.md`
  - `docs/screens/INDEX.md`
- The room server (`supabase/functions/livekit-token/index.ts`) doesn't use the minimum. Check that matching still fills existing rooms first.

---

## 1b. Agreed with Sammy on 2026-10-08: game mode, a bottom bar, and a livelier app

Sammy said yes to all of this, as long as it follows good UI rules. There are no designed screens for these yet. Design them from `CIRCLES_DESIGN_DIRECTION.md`, `tokens.json` and the UI skill rules (`ui-ux-pro-max-core`: 44-point targets, contrast, never colour alone, reduced motion, states for loading, empty and error). Show Sammy web-preview pictures before finishing each part.

**Sammy's goal:** "It feels like a graveyard now." The app should feel lively and full of things happening, without looking scattered. **Never fake activity:** no made-up people, rooms or numbers. When it's quiet, show what's coming up next instead of an empty list.

**The full designs are written. Build from them:**
- `docs/design/pages/game-mode.md`: the full game screen (layout, the ⋯ menu, instant moves, movement, sounds, buzz, each game, states, accessibility).
- `docs/design/pages/tabs.md`: the bottom bar and the Home, Explore, Groups and Me pages.
- `CIRCLES_DESIGN_DIRECTION.md` (sections 6 and 9) and `doors.md` are updated to match.

Short version:
- **A. Game mode:**
  - A full screen that never scrolls: a face strip you can hide, a big board, and only the mic and chat at the bottom. Everything else, including Leave room (which asks first), goes in the ⋯ menu.
  - Instant moves on your own phone, sliding pieces, quiet sounds with an on/off switch (`expo-audio`), and a buzz on your turn.
- **B. Four tabs:**
  - **Home:** the doors, plus For you and Go back in.
  - **Explore:** Live now, Tonight, Every week.
  - **Groups:** Next up, invitations, your groups, My people, reminders.
  - **Me:** profile and settings.
- **C. Scheduled and weekly rooms, reminders and invitations:** these need `expo-notifications` and a server job that sends them.
  - **Friends seeing your room** follows `doors.md` › My people exactly. You choose whether friends see the public room you're in. Someone in a support room only ever shows as "Online, not in a room".
  - **Search:** later.
- **Tip for Sammy:** schedule a few real regular rooms yourself during the open test, so Explore always has something on it.

### Order of work
1. ~~Room sizes (section 1).~~ Done.
2. ~~Game mode (A).~~ Done (2026-10-08), with `expo-audio` and `expo-notifications` added, so one new build covers sounds and later reminders. See `docs/BUILD_NOTES.md` part 14.
3. ~~Bottom bar and the Home, Explore, Groups and Me pages (B).~~ Done for what works with today's rooms (2026-10-08; `docs/BUILD_NOTES.md` part 17). Still to come with C: Explore's Tonight and Every week, Groups' Next up, invitations, your groups and reminders, the bell on Home, Coming up, and Start a group.
4. Scheduled and weekly rooms, reminders and invitations (C). **Next.**

After each part: tests, the `circles-reviewer` agent, then update BUILD_NOTES, PROGRESS and this file.

---

## 2. What Sammy needs to do (before the phone test)

The full click-by-click steps are in `docs/BUILD_NOTES.md`, under "What you need to do now".

1. **Database:**
   1. In Supabase, open SQL Editor and paste in `supabase/migrations/20261010000000_open_test_extras.sql`.
   2. Run it. It should say Success, and it's safe to run again.
2. **Room server:**
   1. Paste `supabase/functions/livekit-token/index.ts` into the `livekit-token` Edge Function.
   2. Click Deploy.
3. **One new app build,** because new phone features were added: the video viewer, the photo picker, screen sharing, and now game sounds and (for later) reminders. Build from the branch `claude/dreamy-meitner-mjoykp` (steps in `docs/BUILD_NOTES.md` part 14). After that, most changes arrive by over-the-air update.
   - Build: `npx eas-cli build --profile preview --platform android`
   - Update: `npx eas-cli update --channel preview --environment development --message "..."`
4. **Phone test** with 3 to 5 phones, using the checklists in `docs/BUILD_NOTES.md`, parts 6 to 12.
5. **Still open from Step 1:** a friend somewhere else, on their own mobile data, to check the Lagos voice quality and echo.

---

## 3. Questions for Sammy

- **Help screens:** a verified Nigerian crisis line and emergency number. Never guess these. No placeholder text may go into a build for real users.
- **Privacy Policy:** a contact email, before a wide launch.
- **Choices in `docs/BUILD_NOTES.md`:** all marked "open to change". Examples:
  - Draughts 8×8 or 10×10
  - Whot house rules
  - chat in support rooms
  - a turn limit for chess and draughts

---

## 4. Still to build

**Games marked "Next" in `CIRCLES_INTENT.md`:**
- Draw and Guess (uses the Table)
- Ayo
- Finish the Line
- Story Chain
- On the Same Wave

**Things in the designs that aren't built yet:**
- Shrinking a room to a small bar
- Notifications and reminders
- Coming up and scheduled rooms, weekly groups ("Tue 7pm")
- "Talk with a trained listener"
- Linking from another app straight into a Learn page (`circles://learn/igbo`)
- From the Table design: a photo ban for repeat reports, and a host switch to turn off notes in support rooms

**Later, only when Sammy decides:**
- Email, then phone checks, made required
- Paid hosted rooms, payments (Paystack or similar), gifts, Circles Plus
- iPhone build, installable web version

---

## 5. Known weak spots to fix before a wide launch

- **Ludo moves** travel on a public Supabase Realtime channel. Switch to private channels with access rules.
- **Ludo dice** are rolled on the phone of whoever taps Roll, so a changed app could cheat. The game-mode design says random things come only from one trusted phone (or the server). Move Ludo onto the Table's starter model, or roll on the server.
- **The Table games' cards and roles** (Whot hands, Mafia roles) are held on the starter's phone, so a changed app could peek. Deal them from the server instead, the way Find the Impostor's words already are.
- **Leftover anonymous accounts:** accounts with no nickname or email are never deleted. Plan a cleanup after 30 days.

---

## 6. Notes for the next Claude

- **Before starting:** follow `CLAUDE.md`. Read `docs/PROGRESS.md`, then this file. Talk to Sammy in plain words, one decision at a time.
- **After each feature:**
  1. Run the `circles-reviewer` agent.
  2. Fix what it finds.
  3. Update `docs/BUILD_NOTES.md` and `docs/PROGRESS.md`.
- **Checks to run before saving:**
  - `npx tsc --noEmit -p .`
  - `npx jest`
  - `npm run test:db` (database rules, runs locally)
  - `deno check` on the Edge Function
- **This cloud container can't reach Supabase, LiveKit or Expo.** So:
  - `expo install` fails. Install with `npm`, using the versions in `node_modules/expo/bundledNativeModules.json`.
  - Sammy runs the real services.
- **Things to avoid:**
  - Never set the image picker's `microphonePermission: false`. It removes the microphone permission the voice rooms need.
  - Never run `git checkout package.json`.
- **When committing:**
  - Save to the branch the session names (this one: `claude/dreamy-meitner-mjoykp`).
  - Keep model names out of commits.
  - Never commit keys.
