# Build notes: the five features (open to change)

Sammy asked me to build five features in a row without stopping, make the choices myself, and write them all down here so he can change anything later. Every decision below is **open to change**: tell me which one, and I'll change it.

Each part ends with **What you need to do**, if anything.

---

## 1. Privacy Policy and Terms

**What I built**
- Both pages are inside the app, in plain words. You can read them from the Welcome screen (the words "Terms" and "Privacy Policy" are now links) and from **Me** at any time.
- The text lives in one file: `src/content/legal.ts`. Change the words there.

**Choices I made (open to change)**
- **They describe what Circles really does today:** nickname and date of birth kept, voice and chat never recorded, games deleted, data handled by Supabase, LiveKit and Expo, nothing sold, no adverts in rooms.
- **They say support rooms are not a crisis, medical or emergency service**, and tell people in danger to contact emergency services.
- **They say Nigerian law applies**, and mention the rights Nigerian data protection law gives people (see their data, correct it, delete it).
- **They say data may be stored outside Nigeria**, for example in the UK or Europe. That depends on the region you chose when you created the Supabase project.
- **There's no company name.** They say "Circles" and "we".
- **There's no contact email yet,** because I won't publish your personal email without asking. Until you give one, the text says an email is coming and points people to Delete my account.

**What you need to do**
1. Read both pages in the app and tell me anything to change.
2. Send me a contact email for privacy questions, for example a new Gmail just for Circles. I'll put it in.
3. Tell me which region your Supabase project is in (Supabase › Project Settings › General › Region), so the "stored outside Nigeria" line is exact.
4. Before a wide launch, ask a Nigerian lawyer to check both pages. These are good, honest drafts, but I'm not a lawyer.
5. The Google Play Store needs the Privacy Policy at a public web address. Once the web version is online (part 2), it'll be at `/privacy` on that address.

---

## 2. Join from a link

**What I built**
- **Invite** at the top left of a room. It opens your phone's share menu (WhatsApp and so on) with a message like "Come and talk with me on Circles: https://…/?room=…&by=YourNickname".
- **The link page** (`docs/screens/16-join-from-a-link.png`): "Ada_K invited you to", the room's name, how many people are there, then **Join in your browser**.
- **Joining:** they answer the 18+ question, pick a nickname, and go straight into that room. The room works in the browser too, with Report, Block, Leave and help.
- **If the room has ended:** the page says "This room has ended" and offers **Find a room**.
- **Phones with the app:** they open `circles://r/<room>` links straight in the app, and the link page has **Open in the Circles app**.
- **Your legal pages** have web addresses too: `/?page=privacy` and `/?page=terms`. You can give those to the Play Store.

**Choices I made (open to change)**
- **No Invite for support rooms, ever.** Nobody can be shown to be in one, and a link to one shows "This room has ended".
- **The link page shows how many people are in the room, never who.** The visitor hasn't met them yet. Taken seats are plain, without names.
- **The link carries your nickname** (`by=`), so your friend sees who invited them. It's never your real name.
- **Links look like `/?room=…`** rather than `/r/…`, so they work on any simple web host. The app still understands `/r/…` links.
- **No text code in the browser**, because the open test has no phone check. It's the same sign-up as the app.
- **In the browser, a small note** says "Keep this tab open. If your screen locks, the sound may stop." Phone browsers can do that, and the app doesn't.
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
