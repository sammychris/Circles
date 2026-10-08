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
- **Chat follows the same rule as the mics.** While a room is waiting for its third person, or a support room has no trained host, you can read the chat but not send ("Chat opens when three people are here"). Otherwise two strangers could chat one-to-one, which the 3-person rule is there to avoid.
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
- **Room names are checked**, because strangers see them: 3 to 40 characters, no phone numbers, no web links, no @names, and nothing that passes for the Circles team or a support room ("Circles official", "Someone to talk to", "crisis", "helpline"). Support rooms always have a trained host, so a room pretending to be one could fool someone who's low. Anyone can still report a room with a bad name (Report, then The whole room).
- **At most 3 rooms an hour per person**, so nobody floods the lists.
- **A room someone started ends after it has been empty for 15 minutes.** Old links then say "This room has ended".
- **Invite only needs the web version online** (part 2), because it works by link. Until then that choice is greyed out and says so.
- **No host role for the person who starts a room.** Everyone has the same controls, as in other free rooms. The design's "creator becomes host" comes with hosted rooms.
- **Sizes are 4, 5 or 6.** Rooms still need 3 people to start talking.
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
- [ ] **Chat with 2 people:** it says "Chat opens when three people are here".
- [ ] **Block:** block someone, and their chat messages disappear for you.
- [ ] **Raise hand:** tap **Raise hand**. The others see a hand and "Hand up" on your seat. Tap the mic to talk, and the hand comes down by itself.
- [ ] **Start a talk room:** I want to talk, then **Start a talk room**. Name it "Test room", pick Football, then **Start the room**. On another phone, I want to talk shows "Test room · Football" in Open now. Join it.
- [ ] **Bad name:** try naming a room "Call 08031234567". It says to leave phone numbers out.
- [ ] **Start a game room:** Let's play, then **Start a game room**. It opens a game room where Play a game works once 3 are in.
- [ ] **Once the web version is online:** Invite in a room shares a link. Opening it in a phone browser shows "YourName invited you to…". Invite only rooms open the share menu by themselves, and never show in Open now.
