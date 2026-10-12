# Circles: what's next

The to-do list for the next Claude Code session. Read it after `docs/PROGRESS.md`.
Last updated 2026-10-11.

---

## 00. Support build (2026-10-12): live, waiting on 3 things from Sammy

Built to CIRCLES_INTENT.md › Support and docs/support-section-spec.md. Database (`20261015000000_support_hosts.sql`) and room server are **live**; the app part reaches phones with `npx expo start` (live mode) or the usual update.

**Works now:** support page with live support rooms (host name + badge, how many in), "Notify me when one starts", One-on-one list of online trusted hosts, host cards with price shown first, request → host has 10 minutes → private room for two with a timer and a 2-minute note → "How was your session?". Become a host (form, 5 training cards, 5-question check, agreement). Me › Hosting: application status, Start a support room, Online for one-on-one, Requests (with a lock-screen alert), edit your card. Hosts: "May be in danger" on a person (help opens on their phone, urgent report to the team).

**Sammy's steps:**
1. **Review host applications:** Supabase › Table editor › `host_applications`. Read the row (professionals: check the licence number with the body named). Set `status` to `approved`, `needs_changes` (write `review_note`) or `rejected`, and save. Approved = a host straight away.
2. **Existing hosts** (added by hand before) have no card yet: ask them to apply in the app (approve them quickly), so they get a card and badge.
3. **Crisis numbers:** `src/content/helplines.ts` is still empty, so "In crisis? Get help now" and "May be in danger" open a help sheet without numbers. Send Claude checked numbers.
4. **Payments (paid one-on-one):** needs a payment provider account (Paystack suggested for naira). Until then, paid sessions show their price but can't be booked ("Paying in the app is coming soon"). Free sessions and a professional's free first session work.

5. **Messages from Help & contact** land in Supabase › Table editor › `feedback` (problems, questions, ideas). Old nicknames are in `nickname_history`.

**Not built yet:** payments, payouts and refunds; scheduled support rooms ("Coming up"); the server ending a one-on-one at its time (the phones do it); phone-number checks for hosts (costs money per text).

---

## 0. Now (2026-10-11): browser test by Claude, and what Sammy asked for

Claude clicked through the whole app in Chrome at phone size (Playwright, two test people), then talked it over with Sammy.

**Built:** log in with nickname and password, email only for a forgotten password (`docs/BUILD_NOTES.md` part 22). Waiting for Sammy's 4 Supabase steps there; then Claude tests it in the browser, then the app update.

**Found, not fixed yet:**
1. **Play now and Find my room skip rooms people started** (`pickRoom` in the room server: `if (room.custom) return false`). With few users, two people end up alone in separate rooms. Proposed: fill started rooms marked Anyone too.
2. **Lag:** a Ludo dice roll takes about 1.2 s to show on both phones even on fast internet. Every move goes to Supabase and back (about 270 ms each way from Sammy's computer), plus a 0.6 s dice animation. Worse on mobile data.
3. **Joining a room takes 5 to 6 seconds.**
4. **Log out and Delete my account do nothing in the browser:** they use `Alert.alert`, which doesn't work on web. Phones are fine.
5. **Start a room:** "Who can join?" has nothing picked; it should start on Anyone.

**Sammy's requests, to talk over before building:**
- **The Table:** show every option in every room, greyed out (light grey) with a reason when it can't be used, instead of hiding it. Support rooms stay notes only (CLAUDE.md, Never list).
- **A drawing pad** for Learn rooms (the same pad Draw and Guess needs).
- **Photos:** Sammy wants a "slider". Ask what he means (a swipeable slideshow?) and what didn't work when he tried photos.
- **The age question:** Sammy wants it removed from sign-up and asked only for special rooms. Claude pushed back (CLAUDE.md: nobody speaks before passing 18+; voice with strangers is the risk; Google Play checks it) and suggested one "I'm 18 or older" tick box on Welcome instead of the date screen. **Waiting for Sammy's decision.**

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
4. ~~Scheduled and weekly rooms and reminders (C).~~ Done (2026-10-08; `docs/BUILD_NOTES.md` part 18). Reminders are set by the phone itself, so no server job or Firebase account was needed.
5. ~~Invitations (the rest of C).~~ Done inside the app (2026-10-08; `docs/BUILD_NOTES.md` part 19). Push alerts wait for Firebase.
5b. **Firebase for alerts:** Sammy agreed (2026-10-08). His steps are in `docs/BUILD_NOTES.md` part 20 (Firebase project, upload the FCM V1 key and `GOOGLE_SERVICES_JSON` file variable on expo.dev, then the new build). `app.config.js` already reads the file. Sammy finished Firebase and expo.dev (2026-10-08). Invitation alerts are built (`docs/BUILD_NOTES.md` part 21): run migration `20261013000000_push_tokens.sql`, redeploy the room server, then send an update once the new build is installed.
6. Group page extras from `circle-detail.md`: **Report group** first (group names are written by people), then Share, a description, the host's picture, and "Remind me if a spot opens".

After each part: tests, the `circles-reviewer` agent, then update BUILD_NOTES, PROGRESS and this file.

---

## 2. What Sammy needs to do (before the phone test)

The full click-by-click steps are in `docs/BUILD_NOTES.md`, under "What you need to do now".

1. **Database:**
   1. In Supabase, open SQL Editor and paste in `supabase/migrations/20261010000000_open_test_extras.sql`.
   2. Run it. It should say Success, and it's safe to run again.
   3. Then do the same with `supabase/migrations/20261011000000_scheduled_rooms.sql` (scheduled rooms and groups), `supabase/migrations/20261012000000_invitations.sql` (invitations) and `supabase/migrations/20261013000000_push_tokens.sql` (invitation alerts).
2. **Room server:**
   1. Paste `supabase/functions/livekit-token/index.ts` into the `livekit-token` Edge Function.
   2. Click Deploy.
3. **One new app build,** because new phone features were added: the video viewer, the photo picker, screen sharing, and now game sounds and (for later) reminders. Build from the branch `claude/dreamy-meitner-mjoykp` (steps in `docs/BUILD_NOTES.md` part 14). After that, most changes arrive by over-the-air update.
   - Build: `npx eas-cli build --profile preview --platform android`
   - Update: `npx eas-cli update --channel preview --environment development --message "..."`
4. **Phone test** with 3 to 5 phones, using the checklists in `docs/BUILD_NOTES.md`, parts 6 to 21.
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

**Game ideas from Sammy (2026-10-11), for after the app works well:**
- Light car games for 3 to 6 people in a play room: racing each other, and a bumper-car game where cars can hit each other (for example, knock the others off the arena).
- More games where 4 to 6 people all compete at once. Ideas:
  - **Bumper-car arena** (try this first): a top-down view, everyone has a small car, push the others off the edge, and the last car left wins the round.
  - **Quick-tap race:** everyone taps when the signal shows, and the fastest wins.
  - **Trivia race:** the first to answer right gets the point.
  - **Hot potato:** pass the "bomb" before it goes off.
- Claude's view: a good fit if rounds are short (1 to 2 minutes), controls are simple (tilt or two buttons), the graphics are light enough for cheap phones and mobile data, and voice keeps going while people play. Never in support rooms, and no scores kept after the room ends. Fast games like these are harder to keep in step across phones than turn-based ones, so try one simple game first. `CIRCLES_INTENT.md` lists graphics-heavy games under Later.

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
- **Supabase from this computer (2026-10-11):** the folder is linked to project `tikcuoyauriohbtapspr` and the CLI is logged in. Database changes: add a migration, then `npx supabase db push --linked`. Room server: `npx supabase functions deploy livekit-token --use-api --project-ref tikcuoyauriohbtapspr`. Don't use `config push` (no `config.toml`; it would overwrite the Brevo and rate-limit settings).
- **Browser testing:** `npx expo start --web --port 8081`, then Playwright at 390×844 with Chrome (`channel: 'chrome'`). `Alert.alert` does nothing on web.
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


---

## Done since (2026-10-08, late)

- Email: Sammy set up Brevo with his Gmail as the sender, custom SMTP in Supabase, rate limit and the code templates. Privacy Policy updated (Brevo, Firebase, new data). Next check: the part 16 phone checklist (email code arrives, log out and back in).
- Later, Sammy's decision: a domain name for Circles (about $10–20 a year) for trusted email and the web version.
