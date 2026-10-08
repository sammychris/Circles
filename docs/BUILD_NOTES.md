# Build notes: the five features (open to change)

Sammy asked me to build five features in a row without stopping, make the choices myself, and write them all down here so he can change anything later. Every decision below is **open to change**: tell me which one, and I'll change it.

Each part ends with **What you need to do**, if anything.

---

## 1. Privacy Policy and Terms

**What I built**
- Both pages are inside the app, in plain words. You can read them from the Welcome screen (the words "Terms" and "Privacy Policy" are now links) and from **Me** at any time.
- The text lives in one file: `src/content/legal.ts`. Change the words there.

**Choices I made (open to change)**
- **They describe what Circles really does today:** nickname and date of birth kept, thank-yous and who opened a room kept, voice and chat never recorded, game words and votes deleted within a few hours, the technical records our providers keep, data handled by Supabase, LiveKit and Expo, nothing sold, no adverts in rooms.
- **They say what deleting your account really does:** your nickname, date of birth, saves, blocks and thank-yous go straight away. Reports you sent **stay**, without your account linked, so someone who was harassed and then leaves doesn't wipe their own report. A report about someone keeps the nickname they had.
- **They say support rooms are not a crisis, medical or emergency service**, and tell people in danger to contact emergency services.
- **They say Nigerian law applies**, and mention the rights Nigerian data protection law gives people (see their data, correct it, delete it).
- **They say data may be stored outside Nigeria**, without naming a country, because I don't know your Supabase region and LiveKit uses servers around the world.
- **There's no company name.** They say "Circles" and "we".
- **There's no contact email yet,** because I won't publish your personal email without asking. Until you give one, the text tells people what works today: tap Report in a room, choose "The whole room" and write their question. It reaches your reports list.

**What you need to do**
1. Read both pages in the app and tell me anything to change.
2. **Before you share Circles widely, send me a contact email** for privacy questions, for example a new Gmail just for Circles. Nigerian data law expects one. I'll put it in, and it replaces the "tap Report" line.
3. Optional: tell me which region your Supabase project is in (Supabase › Project Settings › General › Region) if you'd like the page to name it.
4. Before a wide launch, ask a Nigerian lawyer to check both pages. These are good, honest drafts, but I'm not a lawyer.
5. The Google Play Store needs the Privacy Policy at a public web address. Once the web version is online (part 2), use `/?page=privacy` on that address (for example `https://circles.expo.app/?page=privacy`). That form works on any web host.

---

## 2. Join from a link

**What I built**
- **Invite** at the top left of a room. It opens your phone's share menu (WhatsApp and so on) with a message like "Come and talk with me on Circles: https://…/?room=…&by=YourNickname".
- **The link page** (`docs/screens/16-join-from-a-link.png`): "Ada_K invited you to", the room's name, how many people are there, then **Join in your browser**.
- **Joining:** they answer the 18+ question, pick a nickname, and go straight into that room. The room works in the browser too, with Report, Block, Leave and help.
- **If the room has ended:** the page says "This room has ended" and offers **Find a room**.
- **If the room is full:** it says so and offers **Find a room**.
- **Phones with the app:** they open `circles://r/<room>` links straight in the app. On Android browsers the link page also has **Open in the Circles app**. It's hidden elsewhere, because there's no iPhone app and the app isn't in the Play Store yet. The design's "Get the app instead" comes once there's a store page to send people to.
- **Already signed in on the app:** a link takes you straight into the room. If the room has ended you see "This room has ended" and **Find me another room**. If you're already in a room, the link waits until you leave; nobody is pulled out of a room.
- **Your legal pages** have web addresses too: `/?page=privacy` and `/?page=terms`. You can give those to the Play Store.

**Choices I made (open to change)**
- **No Invite for support rooms, ever.** Nobody can be shown to be in one, and a link to one shows "This room has ended". The room server also refuses to let anyone but a host into a support room by its id, so support rooms are only reachable through the "Need someone to talk to" door.
- **The inviter's name on the link page is checked.** Names that look like a phone number, or that could pass for the team ("Circles_Team", "Admin", "Support"…), aren't shown. Those names can't be chosen as nicknames any more either.
- **The link page shows how many people are in the room, never who.** The visitor hasn't met them yet. Taken seats are plain, without names.
- **The link carries your nickname** (`by=`), so your friend sees who invited them. It's never your real name.
- **Links look like `/?room=…`** rather than `/r/…`, so they work on any simple web host. The app still understands `/r/…` links.
- **No text code in the browser**, because the open test has no phone check. It's the same sign-up as the app.
- **In the browser, a small note** says "Keep this tab open. If your screen locks, the sound may stop." Phone browsers can do that, and the app doesn't. It shows once per visit.
- **There's no "I already have an account" on the link page** while email is switched off. It comes back when email does.
- **The Invite button stays hidden until the web version is online**, so nobody shares a link that doesn't work yet.

**What you need to do: put the web version online (about 10 minutes, free)**

Expo, which you already use, can host the web version. In PowerShell, in your `Circles_app` folder, after `git pull`:

1. Copy the three public values Expo already has into a local file:
   ```
   npx eas-cli env:pull --environment development
   ```
2. Build the web version:
   ```
   npx expo export --platform web
   ```
3. Put it online. The first time, it asks you to choose a name; type `circles` or similar:
   ```
   npx eas-cli deploy --prod
   ```
   At the end it prints your web address, something like `https://circles.expo.app`. **Send it to me.**
4. I'll then give you one command to store that address. After that, you rebuild the app and run steps 2 and 3 again, so the **Invite** button appears in both the app and the browser.

I couldn't run these commands from the cloud, because the network here blocks Expo's servers. If any step prints something unexpected, paste it to me.

**Known limits (open to change)**
- A paused person can delete their account and make a new one. Without email or phone checks there's no way to tell it's the same person. Email and phone checks, when you turn them on, fix this.
- The link page asks the room server how many people are in a room each time it opens. It's cheap, but if someone hammered it on purpose it could add a little to the LiveKit bill. If that ever shows up, I'll add a limit.

---

## 3. Chat in rooms

**What I built**
- A **Chat** button in the room's bottom row (speech-bubble icon). A small ember number shows how many new messages you haven't read.
- Tapping it opens the chat from the bottom: everyone's messages with their nicknames, and a box to type with a round send button. Emoji work.
- Tapping someone's name in the chat opens the usual Save, Block and Report for them.

**Choices I made (open to change)**
- **Chat is never stored.** Messages go straight between the phones in the room, through LiveKit, and disappear when you leave. Nobody, including you, can read them later. The Privacy Policy already says this.
- **Text only.** No photos, no voice notes, and links don't open. That keeps support rooms free of shared photos, as the rules say.
- **Chat is in every room, support rooms too.** Some people find it easier to type than to speak when they're low. Tell me if you'd rather turn it off in support rooms.
- **Chat follows the same rule as the mics.** While a room is waiting for its second person (third in support rooms), or a support room has no trained host, you can read the chat but not send ("Chat opens when someone joins"). Support rooms keep the 3-person rule so someone who is down is never alone with one stranger.
- **Messages from people you've blocked are hidden**, including ones they sent before you blocked them.
- **Up to 300 characters and 4 lines a message, and 5 messages in 10 seconds.** Faster than that, it says "Slow down a little". A changed app that tries to flood the chat is ignored by everyone else's phone.
- **Names can't be faked.** The name on a message comes from the room server, not from the message, and phones aren't allowed to change their own name or host badge.
- **You only see messages sent after you joined.** There's no history, because nothing is stored.
- **Reports can't include chat messages yet**, because they aren't stored. People can copy a message (press and hold) into the report's "Tell us more" box.

**What you need to do**
- Update the room server (`livekit-token`) the same way as before, so phones are allowed to send chat. It's in the list at the end.

---

## 4. Raise hand

**What I built**
- A **Raise hand** button in the room's bottom row (hand icon). Tap it and your seat shows a small ember hand and "Hand up" under your name, for everyone in the room. The button turns ember and says **Lower hand**.
- **Your hand comes down by itself when you start talking** (when you unmute).
- Screen readers say "Ada_K, muted, hand up".

**Choices I made (open to change)**
- **A hand is a gentle "I'd like to say something".** In free rooms nobody has to let you in: everyone can unmute any time. The hand just helps quieter people get a turn.
- **Only the room server can raise or lower a hand**, through the `livekit-token` function. This stops a changed app from faking its name or a "Trained host" badge.
- **Not during games.** Ludo and Find the Impostor draw their own seats, which don't show hands, so the button steps aside during a game and any raised hand comes down when a game starts.
- **While you're talking, Raise hand is greyed out.** You already have the floor.
- **A hand can change at most once every 3 seconds**, so nobody can make it flash at others.
- **The hand badge takes the place of the muted badge** on a seat while a hand is up (the design shows both badges in the same corner). Screen readers still say "muted, hand up".
- **Not built yet: the host's "Hands" list** (the design's "2 hands up · See hands", Let in, Not now). That belongs with hosted rooms, where the host decides who speaks. Free rooms and support rooms don't have speaker turns yet.

**What you need to do**
- Update the room server (`livekit-token`). It's in the list at the end.

---

## 5. Start something

**What I built**
- **"Start a talk room"** at the end of the room list under **I want to talk**, and **"Start a game room"** at the bottom of **Let's play**.
- One page (`docs/screens/17`): name your room (up to 40 characters), pick a topic (Football, Music, Faith…, optional, Talk only), choose how many people (up to 4, 5 or 6), and who can join: **Anyone** or **Invite only**. Then **Start the room**, and you're in it.
- **Anyone** rooms appear in the door's **Open now** list with their topic ("Football · 4 of 6 seats"). **Let's play** now has an Open now list too.
- **Invite only** rooms are never listed. When you start one, your share menu opens so you can send the link straight away.

**Choices I made (open to change)**
- **Talk and Play only, starting now.** The design's step 1 (Talk, Learn, Play) and step 2 (once or every week) wait until Learn and weekly groups exist. Coming from a door, you skip straight to the details, as the design says.
- **Rooms people start are never filled by "Find my room" or "Play now".** Someone who picked "Want to laugh" shouldn't land in "Arsenal fans". People find them in the list, or by link.
- **Nobody can start a support room.** Those only open for trained hosts. The database refuses it too.
- **Room names are checked**, because strangers see them: 3 to 40 characters, no phone numbers, no web links, no @names, and nothing that passes for the Circles team or for trained help ("Circles official", "Admin", "Someone to talk to", "crisis", "helpline", "therapist", "counsellor", "support group", "suicide"…). Tricks like "C1rcles", "Circ les" or look-alike letters are caught too. **This word list is a safety choice: tell me any words to add or remove.** Support rooms always have a trained host, so a room pretending to be one could fool someone who's low. Anyone can still report a room with a bad name (Report, then The whole room).
- **At most 3 rooms an hour per person**, so nobody floods the lists. Someone determined could get round it with several anonymous accounts. Email or phone checks fix that later.
- **A room someone started ends once nobody has been in it for 15 minutes.** Old links then say "This room has ended". If the room server can't reach LiveKit, it never closes a room for looking empty.
- **You choose who can join every time.** Neither "Anyone" nor "Invite only" is picked for you, because "Anyone" lists your room publicly. The size starts at "Up to 6", the normal room size.
- **If a room doesn't start** (a name the server refuses, or too many rooms this hour), **Back** returns you to the form with what you typed.
- **In a browser, the share menu can't open by itself**, so an invite-only room shows "Tap Invite to send the link" instead.
- **Nobody can read who started a room**, not even through the database.
- **Invite only needs the web version online** (part 2), because it works by link. Until then that choice is greyed out and says so.
- **No host role for the person who starts a room.** Everyone has the same controls, as in other free rooms. The design's "creator becomes host" comes with hosted rooms.
- **Sizes are 4, 5 or 6.** The room goes live when a second person joins.
- **Not built yet:** a description (280 characters), "Start a room with friends" on My people, weekly groups with reminders, and hosted rooms of up to 10.

**What you need to do**
- Run the new database update and update the room server. Both are in the list below.

---

## What you need to do for all five (in order)

1. **Database update:** in Supabase, SQL Editor, New query: paste `supabase/migrations/20261010000000_open_test_extras.sql` from GitHub (Copy raw file), click **Run**, and expect **Success**. It's safe to run twice.
2. **Room server:** in Supabase, Edge Functions, **livekit-token**, Code: replace everything with `supabase/functions/livekit-token/index.ts` from GitHub and click **Deploy**.
3. **New app build:** in PowerShell, in your `Circles_app` folder:
   ```
   git pull origin claude/gallant-faraday-7s2l1w
   npm install
   npx eas-cli build --profile preview --platform android
   ```
   Install it on each phone from the link when it's done.
4. **Web version (for Invite and Invite only):** the steps in part 2.
5. **When you can:** send me a contact email for the Privacy Policy (part 1).

## Phone checklist (3 phones)

- [ ] **Welcome:** tap Terms, then Privacy Policy. Both open and read clearly.
- [ ] **Me:** Privacy Policy and Terms are there too.
- [ ] **Chat:** in a room with 3 people, tap **Chat** and send "hello". The other phones show a small number on Chat; open it and they see your message with your nickname.
- [ ] **Chat on your own:** alone in a room, it says "Chat opens when someone joins".
- [ ] **Block:** block someone, and their chat messages disappear for you.
- [ ] **Raise hand:** tap **Raise hand**. The others see a hand and "Hand up" on your seat. Tap the mic to talk, and the hand comes down by itself.
- [ ] **Start a talk room:** I want to talk, then **Start a talk room**. Name it "Test room", pick Football, then **Start the room**. On another phone, I want to talk shows "Test room · Football" in Open now. Join it.
- [ ] **Bad name:** try naming a room "Call 08031234567". It says to leave phone numbers out.
- [ ] **Start a game room:** Let's play, then **Start a game room**. It opens a game room where Play a game works once 2 are in (Find the Impostor needs 3, Mafia 5).
- [ ] **Once the web version is online:** Invite in a room shares a link. Opening it in a phone browser shows "YourName invited you to…". Invite only rooms open the share menu by themselves, and never show in Open now.

---

## Over-the-air updates (no more reinstalling)

**What I set up**
- The app can now receive changes without a new install. The add-on is `expo-updates`, linked to your Expo project (`dc307e92-…`).
- The build also carries three new phone features, ready for the Table: a web viewer (YouTube and Vimeo), a photo picker (your photo library only, no camera), and Android's screen-sharing permission.
- **Me** shows "Version 1.0.0 · updated 8 Oct, 14:05" once an update has arrived, or "as installed" before that.

**When you need a full build again:** only when I add a new phone feature. I'll always say so, and I'll raise the app version so old installs never get an update they can't run.

**How to send an update** (when I tell you one is ready), in PowerShell in your `Circles_app` folder:
```
git pull origin claude/gallant-faraday-7s2l1w
npm install
npx eas-cli update --channel preview --environment development --message "What changed"
```
Then on each phone: open Circles, close it fully (swipe it away), and open it again. The first opening downloads the update; the second uses it. Check **Me** for the new "updated" time.

---

## 6. The Table: notes, Watch together, photo slides, Share my screen

**What I built**
- A **Table** button in every room's bottom row (Raise hand, Chat, Table, Leave, as in the design). It opens **Put on the table** (`docs/screens/18`):
  - **A note or link:** up to 500 characters. The first line reads as a headline (`docs/screens/19`). Links show only the site name ("bbc.com") and ask before leaving Circles.
  - **Photos:** pick up to 20 from your phone. They're made smaller before sending.
  - **Share my screen:** like a WhatsApp call.
  - **Watch together:** paste a YouTube or Vimeo link.
  - **Games:** in game rooms, Ludo and Find the Impostor now live here too. The old "Play a game" button is gone.
- **While something is on the table**, the seats move up into a row of small faces, and the card sits in the middle, as in the design.
- **Your idea, for photos and videos: the presenter leads.** When the presenter moves to the next photo, or plays, pauses or skips the video, everyone follows. Anyone can go back on their own phone. They then see **Back to live**, which jumps them to wherever the presenter is.
- **The card's options (•••):** **Take it off the table** for the person who put it there, or a trained host, and **Report it**. Every report made while something is on the table carries a short description of it, so the team can see what it was.

**Choices I made (open to change)**
- **Support rooms: notes and links only.** No photos, videos or screens, which is your existing rule. The room server also stops phones in support rooms from sending a screen at all.
- **One thing on the table at a time.** Only the person who put it there (or a host) can take it off or replace it. If two people put something on at the same moment, the first one stays.
- **When the presenter leaves the room, their item goes with them.**
- **The table opens once the room is live** (2 people, 3 in support rooms), like the mics and the chat.
- **Photos and shared screens are hidden until each person taps "Tap to see".** I went further than "blurred": nothing is drawn at all until you tap, because a blur can still show too much.
- **Videos and shared screens only load when each person taps**, to save data. The presenter's own loads straight away.
- **Watch together only accepts YouTube and Vimeo links**, shown in their official players, so the rights and ads stay with them. Private and age-restricted videos won't play. The video goes quieter while someone else is talking, and there's a tip that headphones stop the sound echoing into the room.
- **The design's "Watch along"** was a countdown where everyone pressed play on their own device. Your idea, the video playing inside the room, replaces it.
- **Photos** go into a private storage folder belonging to the person who shared them. They're shared as links that stop working after 3 hours, and the room server deletes them after 3 hours. Photos attached to a report are kept so you can check them in Supabase, under Storage, in the **table** bucket.
- **Shared screens** are live only: never recorded, with no sound from the screen. They're sent at a quality that's light on data (720p, 5 pictures a second), which is fine for showing and explaining. Before sharing, the app warns: "Everyone in this room will see your whole screen, including messages and notifications that pop up."
- **In a browser,** screen sharing works on computers only. Phone browsers can't share their screen.
- **The Privacy Policy now covers photos, shared screens and the YouTube and Vimeo players.**
- **Only a trained host can replace or take off someone else's item**, and then it goes for everyone. If you block the presenter, their item disappears for you.
- **If the room drops below its minimum while you're sharing your screen, sharing stops.** The table hides then, so you'd have no Stop button.
- **Photos are deleted from storage itself 3 hours after upload, oldest first.** A photo can't be missed, and reported ones are kept.
- **A shared screen is only sent while someone is watching it**, to save the presenter's data.
- **Not built yet from the Table design:** Words (for Learn), a photo ban for repeat reports, and a host switch to turn off notes in support rooms.

**What you need to do**
1. Run the database update again: `supabase/migrations/20261010000000_open_test_extras.sql` (it now also creates the photo storage). It's safe to run twice.
2. Update the room server (`livekit-token`) again.
3. These need the new build you're doing now (the web viewer, photo picker and screen sharing are in it). After that, the Table comes by over-the-air update.

**Phone checklist (3 phones)**
- [ ] Tap **Table**, then **A note or link**. Write "What's the best suya spot?" and put it on. All phones show it in the middle.
- [ ] Tap ••• on the note, then **Take it off the table**. It's gone for everyone.
- [ ] **Watch together:** paste a YouTube link. The others tap **Tap to watch**. Press play and pause on yours, and theirs follow. On another phone, rewind: **Back to live** appears and brings them back.
- [ ] **Photos:** pick 3 photos. The others see **Tap to see**. Slide to the next one, and theirs follow. On another phone, go back: **Back to live** appears.
- [ ] **Share my screen:** read the warning, allow it, then open another app. The others tap **Tap to see** and watch your screen. Tap **Stop sharing**.
- [ ] In a support room, **Table** only offers **A note or link**.

---

## 7. Take turns and Quiz on the Table

**What I built**
- **Take turns** (Table, then Do together): an optional topic ("Your best Lagos traffic story") and how long each turn lasts: 1, 2 or 3 minutes. Everyone in the room is in the order, starting with whoever started it. People who arrive later join the end. The card shows whose turn it is (in green) and how long is left. When time's up it moves on by itself. The speaker can tap **Pass to the next person**, and the starter can tap **Next person**.
- **Quiz:** a question with 2 to 4 answers. You can mark the right one; if you don't, it's a poll. Everyone taps an answer on their own phone and can change it until the reveal. The starter sees "3 of 5 answered" and taps **Reveal the answers**. Everyone then sees how many people chose each answer, with the right one ticked.

**Choices I made (open to change)**
- **Nobody ever sees who chose what**, only how many. Answers go only to the starter's phone, which just counts them. No points, scores or rankings, as your rules say.
- **Not in support rooms.** Those keep notes and links only, as the design says.
- **Turns don't mute anyone.** It's only a guide. Nobody is ever muted by a game or activity (your Never list).

**Phone checklist**
- [ ] Table, then **Take turns**, 1 minute. All phones see the order. After a minute it moves on by itself. The person whose turn it is taps **Pass**, and it moves on.
- [ ] Table, then **Quiz**: ask "Best jollof?" with Lagos, Accra and Abuja, and mark Lagos. Others answer. Tap **Reveal**: everyone sees the counts, and nobody's name.

---

## 8. Host tools (trained hosts)

**What I built** (from `docs/design/pages/room-host-view.md`)
- A trained host sees **"You're the host"** under the room's title.
- **Hands:** for the host, the Raise hand button becomes **Hands**, with a count. When hands are up, a strip above the buttons says "2 hands up", with faces and **See hands**. The list is oldest first, with "Waiting 2 min":
  - **Let in:** the person sees "You can talk now. Unmute when you're ready." Nobody is ever unmuted for them.
  - **Not now:** their hand comes down, and they see "The host lowered your hand. You can raise it again later." No reason is shown.
- **Tapping a person** gives the host **Mute**, **Save, block or report**, and **Remove from room**. A muted person can unmute themselves.
- **Remove from room:**
  - The host must pick a reason: Unkind or insulting, Sexual or creepy, Spam or selling, Off-topic after a warning, or Other.
  - There's a switch for "Also report to the Circles team", which turns on by itself for "Sexual or creepy". The confirm can't be closed by tapping outside it.
  - The removed person sees **"You were removed from this room"**, the reason, the matching rule, and "You can't rejoin this room, but you can join others". They also get **This wasn't fair**, to send you a short note.
  - The room server keeps them out of that room while it's open, by link, by list or by matching.
- Only the room server can do these things, and only for people in your `hosts` table.

**Choices I made (open to change)**
- **Host tools work wherever a trained host is**, not only in support rooms. Trained hosts are people you trust.
- **A host can't mute or remove another trained host.**
- **A removal lasts 3 hours.** Rooms are reused, so a removal that never ended would shut someone out of support for good. 3 hours covers the room it happened in.
- **Voice tickets now last 10 minutes** (LiveKit renews them while you stay), so a removed person can't sneak back with an old one.
- **Removals are kept in the `room_removals` table**, with the reason and any appeal, for you to read in Supabase. The Privacy Policy now says so.
- **Not built yet from the host design:** lock the room, pass host to someone, end the room for everyone, the host-leaving sheet, the 7-speaker limit, and the minimised room bar.

**What you need to do:** run the database update and update the room server again.

**Phone checklist** (your phone as the trained host, plus 2 others, in a support room)
- [ ] You see "You're the host". Another phone raises a hand: you see "1 hand up" and **See hands**. Tap **Let in**: they see "You can talk now".
- [ ] Raise again, then **Not now**: their hand comes down with the message.
- [ ] Tap their seat, then **Mute**: they're muted and told. They can unmute.
- [ ] Tap their seat, then **Remove from room**, then **Unkind or insulting**, then **Remove**. They see the removed screen and can't get back in with **Come in**.

---

## 9. My people: Start a room with friends

**What I built:** an ember **Start a room with friends** button on My people. It opens an invite-only Talk room called "YourNickname and friends", with you in it, and your share menu opens so you can send the link.

**Choices I made (open to change)**
- **It needs the web version online, like every invite.** Until then the button is greyed out and says why.
- **Not built yet:** "On now", which shows which friends are online and in what room. It needs privacy settings first ("Show friends when I'm online" and "Show which room I'm in"). I'd rather build those carefully, never showing support rooms, than rush it.

---

## 10. Rooms of up to 10 (support rooms)

**What I built:** the seat circle now draws up to 10 seats. Rooms of 7 to 10 get a wider ring with smaller faces, as the design says. **Support rooms now hold 10**, with a trained host. Your own seat is always at the very bottom, whatever the size.

**Choices I made (open to change):** free rooms stay at 6, and rooms people start can be 4, 5 or 6. The database update raises existing support rooms to 10.

---

## 11. Learn together

**What I built** (`docs/screens/14` and `15`, `learn.md`)
- **The Learn together door:** **Practise now**, language tiles (Igbo, Yoruba, Hausa, Pidgin, French, English) each with its greeting and how many groups are open, and skills (Public speaking, Coding basics).
- **Each language or skill has its own page:** **Practise Igbo now**, "Your level: Beginner. Change", the practice groups open now, and **Start an Igbo practice group**.
- **Your level** is asked the first time ("What's your Igbo like?": Beginner, Getting there, Fluent) and remembered on your phone.
- **Matching** puts you with people learning the same language at the same level, up to 7 per room. If there's no room, you start one and others at your level join you.
- **Words on the Table** (Learn rooms only): up to 10 words with meanings, one per line ("kedu = how are you"). You show them one at a time, so the room can try saying each one first.
- In a Learn room the Table offers notes, Words, Take turns and Quiz.
- Languages are sorted with the busiest first. While the list loads it says "Checking"; if you're offline it says so, with **Try again**. Practise now works either way.
- More than 10 words? It tells you, instead of quietly dropping the extra ones. A screen reader reads each new word as it's shown.

**Choices I made (open to change)**
- **Pidgin and English are added** to the design's four languages, because they suit Nigeria. Tell me which languages and skills you want.
- **No scheduled groups ("Tue 7pm") yet,** and no paid hosted classes. Those need reminders and payments. The page says "Hosted classes with verified teachers come later" instead of showing a made-up price.
- **No link from the Igbo app yet** (`circles://learn/igbo`).

**What you need to do:** run the database update and update the room server again.

**Phone checklist**
- [ ] Learn together, then **Igbo**, then **Practise Igbo now**. It asks your level; pick Beginner. You're in an "Igbo practice" room showing "Beginner".
- [ ] A second phone picks Igbo and Beginner and lands in the same room. A third picking Fluent gets a different room.
- [ ] In the room, Table, then **Words**: type "kedu = how are you" and two more. Tap **Show the first word**.

---

## 12. More games: Draughts, Chess in teams, Whot, Mafia

All four are under Table, then Games, in game rooms, next to Ludo and Find the Impostor.

**How they run:** whoever starts a game holds it on their phone. Everyone else's moves go there, are checked against the game's rules, and the result goes to everyone. Anything hidden (a Whot hand, a Mafia role) is sent only to the person it belongs to. Nothing is kept: no points, streaks or rankings. Whoever started a game can end it ("End game" in the bottom row). Everyone else gets **Leave game**: they stop playing but stay in the room. At the end, the starter gets "Play again" (only when there are still enough people), and everyone gets "Back to talking".
- **A short drop-out doesn't throw you out.** If your signal drops, your place in the game (your Whot hand, your Mafia role) is kept for 30 seconds while you come back.

**Draughts** (our own code)
- Two teams, Sun and Sky, on the common 8 × 8 board.
- Capturing is compulsory and a piece can jump several times in one turn. A piece that reaches the far side becomes a king, which moves one square in any diagonal direction.
- Your team talks it over, then anyone on it taps a piece (it has a ring) and where it goes. Team Sky sees the board from its own side.
- Pieces don't rely on colour: Sun's are solid with a sun, Sky's are hollow with a cloud, and kings have a crown.
- It's a draw after 80 moves without a capture. A team with nobody left loses.

**Chess in teams** (rules from chess.js, a free, open-source chess library, BSD licence)
- Team Sun plays white, Team Sky black.
- On your team's turn, anyone taps a piece and a square to suggest a move, for example "Ada_K suggests Knight to f3". It's played when most of the team taps **Agree**, or after 60 seconds with the latest suggestion, as the design says. Teammates can tap **Suggest another**.
- The 60 seconds start with the first suggestion and don't restart, so nobody can hold the game up by suggesting again and again.
- Sun's pieces are outlined, Sky's are solid, so they don't rely on colour.

**Whot** (our own code, Nigerian rules)
- 54 cards, 5 each.
- 1 Hold on, 2 Pick two, 5 Pick three, 8 Suspension, 14 General market (everyone else picks one, and you play again), 20 Whot (call a shape).
- Stuck? **Go to market**. First to finish wins.
- **Your hand is only on your phone.** Everyone sees how many cards each person has.
- Anyone who takes more than 60 seconds goes to market, so the game never stalls.
- When the market runs out, the played cards are shuffled into a new market. If there are no cards left at all, whoever holds the fewest wins.

**Mafia** (our own code)
- **The person who starts it is the narrator**, as in the real game. They don't play, and they see the roles so they can narrate. It needs at least 5 people: a narrator and 4 players.
- Roles: Mafia (two Mafia with 6 or more players), Doctor, Detective, and Townspeople. Each player sees only their own role, and can hide it. Two Mafia are told who their partner is.
- **Night lasts at most 20 seconds, and everyone's mic is paused**, with "Night: the Mafia is choosing" shown on the mic. The design allows this for short secret phases only.
  - Every phone lifts the pause by itself after about 22 seconds, even if the narrator's phone goes quiet.
  - People whose mic was on are told "Night is over. Tap the mic to talk."
- **Day:** everyone talks, then votes. While voting, only "3 of 5 have voted" shows. The result, with the number of votes, comes at the end of the day. Live counts would let people work out who voted for whom from the timing.
- **"Out" players stay in the room**, keep listening and can chat; they just can't vote. Nobody is ever muted or removed for real.

**Choices I made (open to change)**
- **Draughts is 8 × 8.** Many Nigerians play 10 × 10 (international draughts); tell me if you'd like that instead.
- **Whot's "General market" lets the player go again.** House rules vary; tell me yours.
- **The starter's phone holds the whole game,** including everyone's Whot hand. Someone with a changed app could peek at the hands of a game they started. For the open test that's fine. Later, the cards can be dealt by the server, the way Find the Impostor's words already are.
- **Nobody suggests a chess move, or a draughts team never moves?** There's no forced move: these are talking games, and the starter can End game. Tell me if you'd like a turn limit.
- **Question for you: board size.** The boards are 280 points wide, as in the design, so each square is 35 points. That is smaller than the 44-point minimum for taps. A full-width board (about 340 on most phones) would give 42-point squares. Shall I widen it?
- **Not built yet:** Draw and Guess, Ayo, Finish the Line, Story Chain, and On the Same Wave.

**Phone checklist** (3 or more phones, in a game room)
- [ ] Table, then **Draughts**: teams appear. Your team taps a ringed piece, then a square.
- [ ] Table, then **Chess in teams**: suggest a move, and a teammate taps **Agree**.
- [ ] Table, then **Whot**: each phone shows only its own cards. Play a 2, and the next person picks two.
- [ ] With 5 phones: Table, then **Mafia**. The starter sees everyone's role and the others only their own. At night, mics pause and the night roles choose. By day, vote.

## 13. Room sizes

- **Support rooms need 3 people and a trained host** before anyone can talk, as before. The host counts as one of the 3. If a support room drops to 2, the 2-minute countdown starts.
- **Every other room goes live at 2.** One person can start or join a room and wait in it ("Nobody's here yet"). If it drops to 1, the same 2-minute countdown runs, then the room closes.
- **Games keep their own minimum.** In a room of 2, Ludo, Draughts, Chess and Whot can be played. Find the Impostor and Mafia are greyed out and say "Needs at least 3 people" or "Needs at least 5 people: a narrator and 4 players".
- **Nothing to set up.** This is app-only; the room server already fills the fullest room first.

**Phone checklist (2 phones)**
- [ ] On one phone, I want to talk, then **Find my room**. It says "Nobody's here yet" and the mic says "Mic paused / Waiting for someone to join".
- [ ] The second phone does the same and lands in the same room. Both mics turn orange ("You're muted / Tap to talk"). Talk.
- [ ] In a game room with 2, tap the Table: Ludo works; Find the Impostor says "Needs at least 3 people".
- [ ] One phone leaves. The other sees the 2-minute countdown ("Waiting for someone to join"). Joining again brings the room back.

---

## What you need to do now (for parts 6 to 12)

1. **Database:** in Supabase, open SQL Editor, then New query. On GitHub, open `supabase/migrations/20261010000000_open_test_extras.sql`, click **Copy raw file**, paste it, then click **Run**. It should say **Success**. It's safe to run again even if you ran an older copy.
2. **Room server:** in Supabase, open Edge Functions, then **livekit-token**, then the Code tab. Replace all the code with `supabase/functions/livekit-token/index.ts` from GitHub, then click **Deploy**.
3. **App:** if you already installed the build with over-the-air updates, send an update. In PowerShell, in your `Circles_app` folder:
   ```
   git stash
   git pull origin claude/gallant-faraday-7s2l1w
   npm install
   npx eas-cli update --channel preview --environment development --message "Table, games, Learn, host tools"
   ```
   Then on each phone, open Circles, close it fully, and open it again. **Me** shows the new "updated" time.
   If you haven't built since the updates were set up, do one build instead (`npx eas-cli build --profile preview --platform android`).
