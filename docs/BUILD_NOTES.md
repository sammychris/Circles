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
