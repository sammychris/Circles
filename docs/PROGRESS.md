# Circles progress

Claude Code updates this file at the end of every build step. Newest entries at the top.

## Current step

**Room sizes, game mode, scores, optional email, the bottom bar, scheduled rooms with weekly groups and phone reminders, and in-app invitations (NEXT.md items 1 to 5) are built and reviewed, not yet tested on phones. Game mode and reminders need one new app build. Invitation alerts on the lock screen are built too and need that same new build (Firebase is set up). Everything still waits for Sammy's Supabase updates (migrations `20261011000000_scheduled_rooms.sql`, `20261012000000_invitations.sql` and `20261013000000_push_tokens.sql`), the new build, and the phone test. The to-do list is in `docs/NEXT.md`. Read it next.**

Every choice made so far, and Sammy's click-by-click steps, are in `docs/BUILD_NOTES.md`.

Still open from Step 1: a test with a friend in another place on their own mobile data (the Lagos mobile-data check, and a proper echo check).

## Decisions made

- Stack: Expo React Native, Supabase, LiveKit Cloud (Agora as backup), Termii for SMS codes. See `CIRCLES_ARCHITECTURE.md`.
- Design: Lamplight (warm dark theme, Nunito, one ember action colour). See `CIRCLES_DESIGN_DIRECTION.md`.
- No tab bar: Home has the doors (see `docs/screens/01-home.png`).
- Sign-up for the open test (5–6 days of public testing): nickname + 18+ question only, email optional, every room open to everyone, no bot check. Sammy will make email and then phone required later. Decided 2026-10-08, after hearing the risks (abusers coming back, vulnerable people in support rooms).
- Block and Report (Step 2b) get built before the open test starts.
- Room sizes (Sammy, 2026-10-08): support rooms need 3 people and a trained host before anyone can talk (`rules.supportMinPeople`); every other room lets one person wait and goes live at 2 (`rules.roomMinPeople`). A live room that drops below its minimum gets a 2-minute countdown with mics paused, then closes. Games keep their own minimums (Find the Impostor 3, Mafia 5); the game list says "Needs at least N people" when the room is too small. Earlier, every room needed 3.
- Every room holds 6 for now, support rooms included (the design allows 10, but the seat circle draws 6, and nobody should be in a room unseen).
- Support rooms only ever run with a trained host. Hosts are rows in the `hosts` table that Sammy adds.
- Ludo is our own code (no outside licence), for two teams (Sun and Sky). Nothing about a game is saved.
- Thank-yous are stored privately; no total is shown to anyone (Never list: no scores). Sammy to decide if anything should show.
- Game mode (Sammy, 2026-10-08; built the same day): a game on the table turns the room into one full, non-scrolling game screen (`docs/design/pages/game-mode.md`): faces at the top (fold to one line), the board at full width, only the mic and Chat at the bottom, everything else in the ⋯ menu, Leave room asks first. Your own moves show straight away and slide back if the starter's phone doesn't confirm within 3 seconds. Pieces slide, tokens hop, cards fly; Reduce motion turns these into fades. Quiet game sounds (made for Circles by `scripts/make-sounds.py`, mixed in with the voices) with an on/off switch in the ⋯ menu and in Me; buzzes from `expo-haptics`. `expo-audio` and `expo-notifications` were added together, so one new build covers sounds and later reminders. Details and choices: `docs/BUILD_NOTES.md` part 14.
- Scores for the sitting (Sammy, 2026-10-08): Ludo, Draughts, Chess and Whot keep a score while people keep playing in the room (just keep count, or first to 3 or 5 wins), with a "wins the set" moment. Play again keeps the teams. The score is gone when the game comes off the table or the room ends: never saved, never on a profile, no leaderboards (CLAUDE.md's Never list still holds). No score for Mafia or Find the Impostor. Rules in `src/games/score.ts`; details in `docs/BUILD_NOTES.md` part 15.
- Optional email and logging back in (Sammy, 2026-10-08): an optional email box when picking a nickname (a code checks it), and "I already have an account" on Welcome. Without an email, an account can't be got back after logging out, reinstalling or changing phones.
- Chess through a set (Sammy, 2026-10-08): teams keep their colours and swap places: the team that moved second moves first next game (they take turns having the white pieces).
- Bottom bar (Sammy, 2026-10-08; built the same day): Home, Explore, Groups, Me (`docs/design/pages/tabs.md`). Home has Go back in and For you from your last 5 rooms, kept only on the phone (never support rooms). Explore lists live rooms. Details: `docs/BUILD_NOTES.md` part 17.
- Scheduled rooms and weekly groups (Sammy, 2026-10-08; built the same day): Start something asks Once or every week. Explore has Tonight and Every week, Groups has Start a group, Next up, Your groups and Your reminders, Home has Coming up, and each group has its own page. Reminders come from the phone itself 15 minutes before (no server or extra account). Support rooms can never be scheduled; only counts are shown, never who; blocks hide rooms both ways. Go in opens the live room from 5 minutes before (no separate Starting soon screen). Open test: scheduled rooms and groups are for anyone; invitations come next. Details: `docs/BUILD_NOTES.md` part 18.
- Invitations (Sammy, 2026-10-08; built the same day, inside the app only): only between people who saved each other, never from a support room, only the sender's nickname shown. Invite from a room, a group's page or a room you scheduled; they show in Groups › Invitations with Join and Not now, and a dot on the Groups tab. Invite only now works without the web version. Push alerts need Firebase (Claude advised setting it up before the next build). Details: `docs/BUILD_NOTES.md` part 19.
- Invitation alerts on the lock screen (2026-10-08): Sammy set up Firebase and uploaded its files to expo.dev (`app.config.js` reads the settings file; nothing in GitHub). Each phone's Expo push address is saved only once notifications are allowed, readable by the room server only, and removed on logout. The room server sends "<nickname> invited you to <title>" through Expo's push service. Details: `docs/BUILD_NOTES.md` parts 20 and 21.
- Age: 18+ for launch. A teen or family version may come later, designed separately (teen-only rooms, parent consent, legal check). Decided 2026-10-08.

## Steps done

### Everything else from the list (2026-10-08), not yet tested on phones

- **Table:** Take turns, Quiz, Words (Learn rooms), and the games Draughts, Chess in teams (chess.js, BSD), Whot and Mafia. Games are held on the starter's phone; hidden parts go only to their owner.
- **Host tools** for trained hosts: Hands list (Let in, Not now), Mute, Remove with a reason (removals last 3 hours, stored in `room_removals` with an optional appeal).
- **My people:** Start a room with friends.
- **10-seat ring**; support rooms hold 10.
- **Learn together:** Practise now by language or skill and level, language pages, practice groups, and Start a practice group.
- Voice tickets now last 10 minutes.
- Tests: 126 app tests, 39 database checks, function type-check.

### The Table and over-the-air updates (2026-10-08), not yet tested on phones

- **Over-the-air updates:** `expo-updates` linked to Expo project `dc307e92-…`, build channels in `eas.json`, runtime version follows the app version (raise it whenever a phone feature is added). Me shows when the last update arrived.
- **The Table** (designs 18 and 19): a note or link, Watch together (YouTube and Vimeo, presenter-led, Back to live), photo slides (up to 20, private storage, deleted after 3 hours unless reported), Share my screen (live, 720p at 5 fps, tap to see), and the games. Support rooms: notes only. The state lives on the presenter's phone and travels on the LiveKit topic `table`.
- **Voice:** `autoSubscribe` is off, so microphones are subscribed explicitly (on join, publish and reconnect) and video only when someone taps.
- New phone features in the last build: react-native-webview, expo-image-picker, expo-image-manipulator, and LiveKit's screen-share service.

### Five features (2026-10-08), not yet tested on phones

- **Privacy Policy and Terms** in plain words (`src/content/legal.ts`), from Welcome and Me. Needs a contact email from Sammy before a wide launch.
- **Join from a link:** Invite in rooms (hidden until `EXPO_PUBLIC_WEB_URL` is set), the link page (design 16), sign-up straight into the room. Support rooms can never be reached by link or id.
- **Chat in rooms:** LiveKit data messages, never stored, hidden from blocked people, rate-limited, paused when the mics are paused.
- **Raise hand:** set by the room server (`hand` action), shown on seats, lowered when you talk or a game starts. Phones can no longer change their own name or metadata.
- **Start something:** Talk and Play rooms with a title, topic, size, and anyone or invite only (`create` action). Never matched, never a support room, ends 15 minutes after it empties.
- Safety review fixes: reports outlive the reporter's account, team-like nicknames and room names refused, links never pull someone out of a room.
- New database file: `supabase/migrations/20261010000000_open_test_extras.sql`. The room server changed too.
- Tests: 89 app tests, 34 database checks, function type-check.

### Find the Impostor (2026-10-08, Sammy asked for it after Step 7), not yet tested on phones

- Built: the "Play a game" sheet in play rooms (Ludo or Find the Impostor) and the Let's play page to match `docs/screens/10-lets-play.png`. Find the Impostor follows `12-find-the-impostor.png`: the speaking-order row, your secret word card with a timer, Hide word, voting, the reveal with vote counts, and 3 rounds.
- The server deals the cards (`supabase/migrations/20261009020000_impostor.sql`): a Naija word pack, a random impostor and a random speaking order. Each phone can only fetch its own card. The answer is only given once everyone has voted or time is up. Counts are shown per person, never who voted for whom. Rounds and votes are deleted when the game ends, and anything older than two hours is swept away; no scores are kept. Games only start in play rooms (checked on the server).
- Checks: 73 app tests and 30 database checks; screens rendered in a browser and compared with the designs; circles-reviewer (its 4 must-fix findings fixed: Play again on every phone, two people tapping Next round, Hide word giving the impostor away, votes kept after the game).

### Steps 2b to 7 (overnight, 2026-10-08), not yet tested on phones

- **2b Safety:** tap a seat for Save, Block and Report. There are three Report sheets (who, what happened, sent), and "Someone may be in danger" is marked urgent. Block silences the person for the blocker, keeps you out of rooms together, and removes saves both ways (a database trigger). Reports and bans can only be read by Sammy in the dashboard. Banned people get "Your account is paused" or "has been closed".
- **3 Home and rooms:** Home with the support line and four doors. I want to talk has optional moods, Find my room and an Open now list. The room server (`livekit-token`: match, join, list, stats, support, delete_account) puts people in the fullest room with a seat and opens new rooms only when needed, never with someone they blocked.
- **4 Room rules:** waiting ("Nobody's here yet"), live, and a countdown with paused mics when the room drops below its minimum (changed later: see Decisions made › Room sizes). Short reconnects don't trigger it. After the room: "Thanks for being there", with private thank-yous, secret saves and "Was everyone kind?". My people lists mutual saves only.
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

## Email (switched back on, 2026-10-08)

Sammy wants email as an optional box, and a way to log back in. `EMAIL_ENABLED` is now on: the nickname screen has "Email (optional)", Me has "Add your email", and Welcome has "I already have an account". It only works once Sammy does the Supabase email setup in `docs/BUILD_NOTES.md` part 16 (the code in two email templates, and an email-sending service). Until then, sending a code fails with "We couldn't send the code", and people can carry on without email. Later: decide when email (and then phone) becomes required.

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
- Not built yet, though they're in the designs: minimise to a room bar, a description on scheduled rooms, the Starting soon screen, "Talk with a trained listener", and the games marked Next (Draw and Guess, Ayo, Finish the Line, Story Chain, On the Same Wave).
- Table games, after review: each phone ends a Mafia night's mic pause by itself (about 22 seconds); a player who drops out keeps their place for 30 seconds; players can Leave game; pieces differ by shape, not just colour. Open question for Sammy: widen the 280-point boards so squares reach the 44-point tap size.
- The under-18 lock is per account. With phone checks later it can become per phone number, as `age-check.md` describes.
- Android app id is `com.sammychris.circles`. Change it before the first Play Store build if Sammy wants a different one.
- Listeners (mic not allowed) get a media-type notification; talkers get a microphone-type one. Needs checking on a real phone with the screen locked.

## Open questions for Sammy

- A contact email for the Privacy Policy (before a wide launch).
- The choices in `docs/BUILD_NOTES.md`, all open to change (e.g. chat in support rooms, room sizes 4–6).
- Verified Nigerian crisis line and emergency number for the help screens.
