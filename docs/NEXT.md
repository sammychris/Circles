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

## 1b. Agreed with Sammy on 2026-10-08: game mode, a bottom bar, and a livelier app

Sammy said yes to all of this, as long as it follows good UI rules. There are no designed screens for these yet. Design them from `CIRCLES_DESIGN_DIRECTION.md`, `tokens.json` and the UI skill rules (`ui-ux-pro-max-core`: 44-point targets, contrast, never colour alone, reduced motion, states for loading, empty and error). Show Sammy web-preview pictures before finishing each part.

**Sammy's goal:** "It feels like a graveyard now." The app should feel lively and full of things happening, without looking scattered. **Never fake activity:** no made-up people, rooms or numbers. When it's quiet, show what's coming up next instead of an empty list.

### A. Game mode (full screen), for every game: Ludo, Draughts, Chess, Whot, Mafia, Find the Impostor
- **Layout:**
  - When a game starts, the room switches to a fixed game screen that never scrolls. Today, tapping or dragging a piece scrolls the room page.
  - **Top:** a thin strip of small faces with the speaking glow, so you still see who's talking. Tap to hide or show it.
  - **Middle:** the board, as big as the phone allows. This also fixes the 35-point squares.
  - **Bottom:** only **mic** and **chat**. The mic is never hidden (muting must stay one tap away).
  - **⋯ menu:** Leave game, End game (starter), Raise hand, Report, and **Leave room**, which asks first. Leave room is no longer a big button that's easy to hit by accident.
- **Speed:** your move shows on your phone straight away (play it with the same rules on your phone). If the starter's phone rejects it, the piece slides back.
- **Movement:** pieces slide, captures fade, cards fly to the pile, the Ludo dice roll, and the win has a small celebration. Respect "reduce motion".
- **Sound:**
  - Short, quiet sounds (dice, piece click, capture, card slap, "your turn" chime, win) from a free CC0 pack such as Kenney.nl. Note the source in BUILD_NOTES.
  - A sound on/off switch on the game screen and in Me.
  - Never in support rooms. Kept soft so voices come first.
  - Needs `expo-audio` (a new phone feature).
- **Buzz:** on your turn and on captures (`expo-haptics` is already installed).

### B. Bottom bar with 4 tabs: Home, Explore, Groups, Me
This replaces "No tab bar" in `CIRCLES_DESIGN_DIRECTION.md` section 9; update that section. A minimised room bar sits just above the tab bar.

| Tab | What's on it |
|---|---|
| **Home** | Kept as it is, a little lighter. Greeting; the support line, always first (as now); the 4 doors; **For you** (1 or 2 rooms like ones you joined before, from your own history, never support rooms); **Go back in** (a room you left that's still open); **Coming up**; "38 people in rooms right now" (real numbers only). |
| **Explore** | "What's happening." **Live now:** every open room, with chips to filter Talk, Play, Learn, and topics. **Tonight:** scheduled rooms later today. **Every week:** regular groups, e.g. "Igbo practice, Tuesdays and Thursdays at 7 pm". Support rooms are never listed. Today the database already hides them from the room list; keep it that way. |
| **Groups** | "What's yours." Groups you joined or started; your people (mutual saves only); your reminders; invitations from your people; **Start a group** with a day, time and "every week". |
| **Me** | Nickname and picture, saved people, add email, sound on/off, help, privacy and terms, delete account, version. |

### C. Scheduled and weekly rooms, reminders, invitations
- **Rooms:** a room can be scheduled (`rooms.scheduled_at` is in the architecture) and can repeat weekly (add a column). Joining before the time shows "Starts at 7 pm".
- **Reminders:** "Remind me" on a scheduled room or group.
- **Invitations:** someone in a Talk, Play or Learn room can invite their mutual connections ("Ada invited you to Ludo"). Never from a support room.
- **No automatic "your friend is in a room".** It breaks the Never rule: hiding only support rooms would give it away.
- **Needs push notifications:** `expo-notifications` plus a server job that sends them. Row Level Security on any new table.
- **Search:** later, once there are many rooms and groups.
- **Tip for Sammy:** during the open test, schedule a few regular rooms yourself (e.g. "Ludo night, Tuesdays at 8 pm", "Igbo practice, Thursdays at 7 pm"), so Explore always has something real on it.

### Order of work
1. Room sizes (section 1). Small.
2. Game mode (A). **Add `expo-audio` and `expo-notifications` to the app in the same change,** so Sammy needs only **one** new build for sounds and later reminders.
3. Bottom bar and the Home, Explore, Groups and Me pages (B).
4. Scheduled and weekly rooms, reminders and invitations (C).

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
