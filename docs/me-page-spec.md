# Me Page (Profile & Settings) — Review & Implementation Spec

## Purpose
The app helps people who are down, lonely, or just want fun conversations talk to people they've never met. **Anonymity is what lets people open up.** Everyone uses a nickname; nothing else about them is shown unless they choose to share it. Phone verification will be added soon to protect people and prevent abuse, but **the phone number is never shown to anyone.**

The **Me** tab is the user's private control center:
- See and edit how others see them (nickname + avatar).
- Manage account and login.
- Control privacy and safety.
- Find help, rules and legal pages.
- Hosts: access host tools (see support-section-spec.md).

Guiding rules: **simplicity, clarity, privacy.** It should be a compact, scannable settings list.

**Decision: keep profile and settings on one page.** Because profiles are minimal (nickname + avatar), a separate profile screen and a separate settings screen would add a step for no reason. One "Me" page is simpler.

---

## Review of the current screen

### P1 — Critical
1. **No way to edit nickname or avatar** — *Affordance*
   The nickname is the user's whole identity in the app, yet it can't be changed from here.
   **Fix:** Add an **Edit** button next to the nickname. Opens: nickname, avatar picker (illustrated avatars or colors/initials, **no real photos by default** to protect anonymity).
2. **The privacy statement looks like a setting** — *Affordance / Hierarchy*
   "Support rooms are never shown to anyone" is bold, large, two lines, with an icon. It's the heaviest text in the Privacy section but it isn't tappable and changes nothing.
   **Fix:** Make it a small grey info line with the shield icon, below the real privacy settings.
3. **"Log out" has an arrow (›)** — *Affordance*
   An arrow means "opens another page". Log out is an action, not a page.
   **Fix:** Remove the arrow. Move Log out to the bottom as a plain text button, with a confirmation ("Log out of [nickname]?").
4. **"Help" is ambiguous** — *Copy*
   It's the crisis link ("If you or someone else needs help now"), but people looking for app help (bugs, questions) will tap it too.
   **Fix:** Split into **"Get help now"** (crisis lines) and **"Help & contact"** (FAQ, report a problem, contact the team).

### P2 — Important
5. **"Saved each other: 0" uses a "Label: Value" pattern** and duplicates the People tab — *Copy / Density*
   "Saved each other" is not a term people know. It also repeats what the People/Friends tab already shows.
   **Fix:** Remove this section from Me. Friends live in the People tab.
6. **"Blocked people" isn't tappable** — *Affordance*
   "You haven't blocked anyone." is shown as plain text, so once someone is blocked there's no clear way in.
   **Fix:** A normal row: **"Blocked people · 0 ›"**, which opens the list (with Unblock).
7. **Toggle state is unclear** — *Color / Accessibility*
   The switch is a white track with a dark knob. It isn't obvious whether it's on or off.
   **Fix:** On = accent color (orange) track with white knob; Off = dark grey track. Position + color together, never color alone.
8. **Inconsistent row spacing** — *Composition*
   "Add your email" and "Password" are crammed together, while "Log out" has a big gap.
   **Fix:** Same row height for every row (56–64px) and the same gap between every section (32px).
9. **Descriptions wrap to two lines** — *Copy / Typography*
   "Set or change the password you log in with" and "Quiet sounds for dice, moves and your turn" wrap.
   **Fix:** Shorten (see layout). Row descriptions should fit on one line.
10. **Version line shows a timestamp** — *Density*
    "updated 11 Oct, 7:48 pm" is a developer detail.
    **Fix:** "Version 1.0.0" only, small grey, at the very bottom.
11. **Missing settings people expect** — *Density*
    No notifications, no phone number, no host entry point.
    **Fix:** Add them (see layout).

### P3 — Polish
12. **Raw username.** "ebuka93" looks like a login name. Let people choose a friendlier nickname in Edit.
13. **Section labels are fine** (small grey: "Account", "Sound", "Privacy"). Keep that style; it follows the convention of subtle section labels with emphasis on the rows.
14. **"Delete my account" is too visible on the main page.** As the only red text, it pulls attention it doesn't deserve, and some users will be in a low mood, where a loud delete invites a quick emotional decision.
    **Fix:** Move it one level deeper, into **Account → Manage account**, at the bottom of that page (the WhatsApp/Instagram/X convention). It must stay findable there: Apple and Google both require in-app account deletion.

---

## Target layout (top to bottom)

```
┌────────────────────────────────────────────────┐
│ (avatar)  Ebuka                      [ Edit ]  │
│           Only your nickname and avatar        │
│           are visible to others.               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐   (shown to non-hosts)
│ 💛 Want to help others?                        │
│    Become a host                            ›  │
└────────────────────────────────────────────────┘
  (approved hosts see "Host tools ›" instead; pending shows "Host application · Pending ›")

ACCOUNT
  📱 Phone number        Verify ›            (shows "Verified ✓" once done)
  ✉️  Email               Add ›               (optional; "For password reset")
  🔑 Password                          ›
  ⚙️  Manage account                   ›     (contains Delete account)

PREFERENCES
  🔔 Notifications                     ›     (room invites, reminders, host requests)
  🔊 Game sounds                     [◯—]     (toggle)
  🌐 App language          English      ›

PRIVACY & SAFETY
  🚫 Blocked people         0          ›
  👁  Show when I'm online             [◯—]   (to friends only)
  🛡  Support rooms are never shown to anyone, including friends.   (small grey info line)

HELP
  🛟 Get help now                      ›     (crisis lines for your country)
  💬 Help & contact                    ›     (FAQ, report a problem)
  📖 Room rules                        ›

ABOUT
  📄 Privacy policy                    ›
  📜 Terms                             ›

        Log out                              (text button, centered or left, no arrow)

        Version 1.0.0                        (small grey)
```

Sections are compact settings lists: icon, label, value or arrow on the right, one line each. Descriptions appear only where needed and fit on one line.

---

## Screens and flows

### Edit profile
- **Nickname** (required, 3–20 characters, must be unique). Helper: "Don't use your real name if you'd rather stay private."
- **Avatar**: pick from illustrated avatars or a color + initial. Real photo upload: off at launch (anonymity first).
- **Optional:** languages you speak, and a short "About me" (max 80 characters). Helper: "Only add what you're happy for strangers to see."
- Save button (primary). Cancel = back arrow.

### Phone verification (coming soon)
- Row shows **"Verify ›"** until verified, then **"Verified ✓"**.
- Flow: enter phone number → receive code (SMS) → enter code → done.
- Copy on the first screen: "We use your number to keep the app safe. **It's never shown to anyone.**"
- Later, when required for everyone: show a one-time prompt after login with "Verify now" (primary) and a short deadline.

### Log out
- Confirmation sheet: "Log out of Ebuka?" → **Log out** / Cancel.
- If the account has no email or phone, warn first: "You haven't added an email or phone. You may not be able to log back in." → **Add email** (primary) / Log out anyway.

### Manage account
- Reached from **Account → Manage account** on the Me page.
- Contains account-level options (e.g. "Download my data", later) and, at the very bottom, **"Delete account"** as small red text.

### Delete my account
- Entry point: **Me → Manage account → Delete account** (not on the main Me page).
- Screen explaining what happens: nickname released, friends removed, history deleted, can't be undone. If the user is a host with pending payouts, say so.
- Ask for the password (or phone code) to confirm.
- Final button in red: **"Delete my account"**. Secondary: **Keep my account**.
- Optional: 14-day grace period ("You can log back in within 14 days to cancel").

### Blocked people
- List of blocked nicknames with an **Unblock** button each.
- Empty state: "You haven't blocked anyone."

### Notifications
- Toggles: Room invites from friends · Room reminders · One-on-one requests (hosts) · App updates.

---

## Sign up and log in (separate screens, before the app)

Keep sign-up as fast as possible; this matches the "easy to enter" goal.

### Sign up (now)
1. **Pick a nickname** ("This is how people will know you.")
2. **Pick an avatar**
3. **Create a password**
4. 🔒 **Confirm you're 18 or older** (checkbox) and agree to Room rules & Terms (links)
5. Land on Home

### Sign up (after phone verification launches)
1. **Phone number** → code → verified ("Never shown to anyone.")
2. Nickname → avatar → 18+ confirmation → Home
3. Password becomes optional (phone code login replaces it, like WhatsApp/Telegram).

### Log in
- Now: nickname + password, with "Forgot password?" (works only if email was added; otherwise "Contact us").
- Later: phone number + code.

---

## Visual system rules
- **Header:** nickname is the largest text on the page (24–30px, bold). Caption 14px grey.
- **Section labels:** 13–14px, grey, optional uppercase with letter-spacing. They are quiet; rows are the focus.
- **Row label:** 16px, weight 500–600, white. **Row value/description:** 14px, grey, one line.
- **Row height:** 56–64px. **Between sections:** 32px. **Side padding:** 16–24px (match other pages).
- **Arrows (›)** only on rows that open another screen. Toggles have no arrow. Actions (Log out) have no arrow.
- **Destructive:** "Delete account" lives inside Manage account as small red text, never on the main Me page; the big red button appears only on the final confirmation screen.
- **Toggles:** on = orange track, off = dark grey track.
- **Contrast:** 4.5:1 for all text, including grey descriptions.
- **Touch targets:** whole row is tappable, 44px minimum.
- **Fonts:** keep the current rounded sans-serif used across the app (matches the warm, friendly brand). Don't introduce a second font.

---

## What NOT to put on this page
- Real name, photo upload (at launch), phone number display, location, age display.
- Friend list (lives in the People tab).
- Support room history (never shown anywhere).
- Developer details (build timestamps).

---

## Summary
- **Strongest part:** the privacy-first wording ("Your nickname is the only thing people see about you").
- **Weakest part:** affordance. You can't edit your nickname, a privacy statement looks like a setting, Log out looks like a page link, and "Help" means two different things.
- **Core change:** a compact, standard settings list with an editable identity header, a host entry point, phone verification ready to plug in, and clearly separated crisis help vs app help.
