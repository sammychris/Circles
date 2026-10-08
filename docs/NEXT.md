# Circles: what's next

The to-do list for the next Claude Code session. Read it after `docs/PROGRESS.md`.
Last updated 2026-10-08.

Everything up to here is built, reviewed by `circles-reviewer`, and pushed to
`claude/gallant-faraday-7s2l1w`. None of it has been tested on phones yet.

---

## 1. Decision waiting for Sammy's yes: how many people a room needs

**Today:** every room needs 3 people before mics turn on. If a room drops to 2, a 2-minute countdown starts and then the room closes.

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

**Status: Sammy said yes (2026-10-08).** Support rooms need 3. Every other room can start with 1 waiting and goes live at 2. Build it as in the table above.

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

## 1b. Ideas being discussed with Sammy (NOT decided yet; don't build until he says yes)

Claude's recommendations, given to Sammy on 2026-10-08:

1. **Game mode (full screen), for every game:**
   - **Layout:**
     - A thin strip of faces at the top, which you can hide, showing who's speaking.
     - The board as big as the phone allows, on a page that never scrolls (today, tapping or dragging a piece scrolls the room page).
     - At the bottom, only the mic and chat. Everything else goes in a ⋯ menu: Leave game, End game, Raise hand, Report, and Leave room (which asks first).
   - **Feel:**
     - Instant moves on your own phone: the piece slides back if the starter's phone rejects it.
     - Pieces slide, cards fly, Ludo dice roll.
     - Short, quiet sounds from a free CC0 pack, with an on/off switch, never in support rooms. Needs `expo-audio`, so one new build.
     - Haptics (`expo-haptics` is already installed).
2. **Bottom bar:**
   - Claude recommends 3 tabs: **Home, Groups, Me**.
   - Explore is skipped because Home already shows every door; Sammy may still want it.
   - **Groups** holds: your people, tonight and coming up, reminders, weekly groups, and Start a group with a day and time (needs notifications).
   - This changes `CIRCLES_DESIGN_DIRECTION.md` section 9 ("No tab bar"), so update that once Sammy decides.
3. **Finding rooms:**
   - **Yes:** a small "For you" row on Home, with 1 or 2 rooms like the ones you joined before. It uses your own history only and never support rooms.
   - **Yes:** friends inviting friends ("Ada invited you to Ludo"). The person chooses to invite their mutual connections. Never in support rooms. Needs notifications.
   - **Yes:** "Go back in" for rooms you left that are still open.
   - **No:** automatically showing "your friend is in a room". It breaks the Never rule about support rooms, because even hiding only support rooms gives it away.
   - **Later:** search, once there are many rooms and groups. With few people it mostly shows empty results.
   - **Back arrows** stay on door pages (normal on Android and iPhone). The tabs cut down how often you need them.

---

## 2. What Sammy needs to do (before the phone test)

The full click-by-click steps are in `docs/BUILD_NOTES.md`, under "What you need to do now".

1. **Database:**
   1. In Supabase, open SQL Editor and paste in `supabase/migrations/20261010000000_open_test_extras.sql`.
   2. Run it. It should say Success, and it's safe to run again.
2. **Room server:**
   1. Paste `supabase/functions/livekit-token/index.ts` into the `livekit-token` Edge Function.
   2. Click Deploy.
3. **One new app build,** because new phone features were added: the video viewer, the photo picker, and screen sharing. After that, most changes arrive by over-the-air update.
   - Build: `npx eas-cli build --profile preview --platform android`
   - Update: `npx eas-cli update --channel preview --environment development --message "..."`
4. **Phone test** with 3 to 5 phones, using the checklists in `docs/BUILD_NOTES.md`, parts 6 to 12.
5. **Still open from Step 1:** a friend somewhere else, on their own mobile data, to check the Lagos voice quality and echo.

---

## 3. Questions for Sammy

- **Game boards:** they are 280 points wide, as in the design, so squares are 35 points, under the 44-point tap minimum. Should the board fill the screen width (about 42-point squares)?
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
  - Save to `claude/gallant-faraday-7s2l1w`.
  - Keep model names out of commits.
  - Never commit keys.
