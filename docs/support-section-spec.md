# Support Section — Review & Implementation Spec

## Purpose
A safe place for people who feel low, lonely or stressed to **talk to kind people who won't judge them**. It is reached from the Home card "Need someone to talk to?".

It offers two ways to get support:
1. **Support rooms**: free group voice rooms, always led by a host. People encourage each other. You can listen without talking.
2. **One-on-one**: request a private session with a specific host. Some hosts are free, some charge a fee shown upfront.

It also needs a third flow that doesn't exist yet:
3. **Become a host**: how a person applies, gets approved, and starts hosting.

Guiding rules: **simplicity, clarity, and safety first.** Since the app is just starting, keep restrictions light, but never remove the safety basics marked 🔒 below.

---

## Review of the current screen

The current screen is only the **"No host is on right now"** state. Host profiles, one-on-one requests, payments and host applications are **not built**. Build them from this spec.

### P1 — Critical
1. **Dead end.** Someone feeling low gets "check back later" with nothing to do.
   **Fix:** Show upcoming scheduled rooms, available one-on-one hosts, and a **"Notify me when a host is on"** button.
2. **"Get help" is a small text link.** For someone in crisis, this must be the most visible element.
   **Fix:** A clear, always-visible button: **"In crisis? Get help now"**, which opens crisis lines for the user's country.
3. **Instruction points to a link** ("tap Get help below"). Remove it; the button speaks for itself.

### P2 — Important
4. **"No host is on right now" is as large as the page title.** Bad news is too loud.
   **Fix:** Make it a small status line under the "Support rooms" section label.
5. **"Listen first if you like"** is promised when no room exists.
   **Fix:** Show it only on a live room's Join action ("Join and listen").
6. **The description repeats** "trained host" twice in two paragraphs.
   **Fix:** One subtitle line (see layout).

### Keep
- The warm, calm tone: "No games, no rush."
- The privacy promise: "Nobody, not even friends, sees you're here."
- The heart icon and soft glow. They set the right mood.

---

## Roles and terms (use consistently everywhere)
- **Host** = an approved person who runs support rooms and/or offers one-on-one sessions.
- **Host badges** (shown on every host's name):
  - **Trained listener**: volunteer, completed the app's host training. Free only.
  - **Professional**: verified counsellor or therapist. May charge a fee.
- **Support room** = a group voice room led by a host.
- **One-on-one** = a private voice session between one user and one host.
- Avoid "therapy" or "treatment" for Trained listeners. Their profiles show: "Peer support, not a therapist."

---

## Main page layout (top to bottom)

```
←

            (heart icon with soft glow)

Someone to talk to
Kind people and a trained host. No judging, no rush.

[  In crisis? Get help now  ]               (always visible, high-contrast button)

Support rooms                    Free · group
┌──────────────────────────────────────────────┐
│ ● Live  Feeling lonely tonight      [Join]   │
│         Host: Ada · Trained listener · 5 in  │
├──────────────────────────────────────────────┤
│ ● Live  Work stress                 [Join]   │
│         Host: Tunde · Professional · 3 in    │
└──────────────────────────────────────────────┘
Coming up
  8:00 pm · Talking about grief · Host: Ngozi        [Remind me]

(empty state: "No support room is live right now."
               [ Notify me when one starts ])

One-on-one                       Private
┌──────────────────────────────────────────────┐
│ (photo) Ada        Trained listener   Free   │
│         English, Igbo · Online now       ›   │
├──────────────────────────────────────────────┤
│ (photo) Dr. Kemi   Professional  ₦X / 30 min │
│         English · Next free: 9pm         ›   │
└──────────────────────────────────────────────┘
(empty state: "No hosts available right now."
               [ Notify me ])

🔒 Nobody, not even friends, sees you're here.

Want to help others? Become a host ›        (small text link at the bottom)
```

Notes:
- **Unlimited rooms and hosts.** Any number of support rooms can run at once, each with its own host. The list simply grows.
- If more than ~5 rooms are live, show the first 5 + "See all rooms".
- If more than ~5 hosts are available, show the first 5 + "See all hosts", with filters: Free · Language · Online now.
- The crisis button sits above everything else, below the subtitle.

---

## Support room rules
- 🔒 **Always has a host.** A room cannot exist without one.
- 🔒 **Minimum 3 people (host + 2) for conversation to start**, so no two strangers are left alone together. While waiting: "Waiting for one more person to join."
- Anyone can **join and listen** with their mic off. To speak, they tap **Raise hand**; the host brings them in.
- Host controls: bring in to speak, mute, remove, end room.
- Each room shows: title/topic, host name + badge, number of people, "Free".
- Hosts can start a room anytime or schedule one ("Coming up" list, with "Remind me").

### Request one-on-one from inside a room
- Tapping the host's avatar opens their **host profile card** (see below), with **[ Request one-on-one ]**.
- This is how listeners in a room can ask the host for a private session.

---

## Host profile card
Shown when tapping any host (in a room or the One-on-one list).

- Photo, display name, badge (Trained listener / Professional)
- One-line intro written by the host ("I've been through burnout and I'm here to listen.")
- Topics (chips): loneliness, stress, relationships, grief…
- Languages
- Availability: "Online now" or "Next available: 9pm"
- **Price**: "Free" or "₦X per 30 min" (always shown before requesting)
- Rating and number of sessions (once they have at least 5)
- Trained listeners show: "Peer support, not a therapist."
- Buttons: **[ Request one-on-one ]** (primary) · Report (small link)

---

## One-on-one request flow
1. User taps **Request one-on-one** on a host profile.
2. Sheet shows: host name + badge, session length (e.g. 30 min), **price or "Free"**, and "Your name stays private: the host sees only your display name."
3. Paid sessions: user pays **before** the session starts (held by the app, released to the host after the session).
4. Host gets the request → **Accept / Decline**. Auto-expires after 10 minutes with "Ada isn't available right now. Try another host?"
5. Session starts as a private voice room with a visible timer.
6. When the time ends: the session ends gently with a 2-minute warning ("2 minutes left"). Offer **Book another session** after it ends, never during.
7. After the session: optional rating + "Was this helpful?" + Report.

### Free time and pricing rules
- Hosts choose their own price. **Trained listeners are always free.** Only **Professionals** can charge.
- A Professional may offer a **free first session** (e.g. 20–30 min). If they do, it is a full session, never cut short to ask for payment.
- 🔒 **Never interrupt a session to request payment.** The price is always agreed before the session starts.
- App fee: a percentage of each paid session (business decision, configurable).
- Refunds: if the host doesn't show up, or the session is reported and upheld.

---

## Become a host (new flow)
Entry points: "Become a host" link at the bottom of the support page, and in the **Me** tab.

Keep it light but safe. Five short steps:

1. **Intro screen**: what hosts do, what's expected, time commitment. "Hosts listen, support and keep rooms safe. You don't give medical advice."
2. **Application form** (one screen):
   - Display name and photo
   - Short intro (max 150 characters)
   - Languages
   - Topics you're comfortable with (chips)
   - Why do you want to host? (short answer)
   - Type: **Trained listener** (volunteer) or **Professional** (licensed)
   - Professionals only: licence/certificate upload + issuing body
   - 🔒 Confirm age 18+
   - 🔒 Phone number verification
3. **Short training** (~15–20 min, in-app): how to listen without judging, what not to say, how to spot a crisis and use the crisis button, room safety tools. Ends with a 5-question check.
4. **Host agreement**: tick to agree to the code of conduct (no asking for money outside the app, no moving users to other apps, no romantic contact, no medical advice from Trained listeners, report crises).
5. **Review**: "Thanks! We'll review your application within 48 hours." Status visible in the Me tab: Pending / Approved / Needs changes.

### After approval
- **Trained listeners** start with **support rooms only**. After a set number of well-rated rooms (e.g. 5), **one-on-one unlocks**. This keeps the start easy while adding a trust step before private sessions.
- **Professionals** can do rooms and one-on-one right away once their licence is verified.
- At launch, reviews are done **manually by the team** (an admin list of applications with Approve / Reject / Request changes). Automate later.

### Host tools (in the Me tab after approval)
- **Go online** toggle (appears in the One-on-one list while online)
- **Start a support room** / **Schedule a room**
- **Requests** inbox (Accept / Decline)
- **My profile** (edit intro, topics, languages, price for Professionals)
- **Earnings** (Professionals only): sessions, amounts, payouts

---

## Safety rules (🔒 = never remove)
- 🔒 **Crisis button** always visible on the support page and inside every support room and one-on-one session. It opens a sheet with crisis lines **for the user's country** (the list must be checked and maintained by the team; never show unverified numbers).
- 🔒 Hosts have an **"Escalate"** button in rooms and sessions to flag a user who may be in danger, which shows that user the crisis sheet and alerts the team.
- 🔒 **Report** available on every host profile, room and session. Two upheld reports → host paused pending review.
- 🔒 Support section is **18+**.
- 🔒 No sharing phone numbers or social handles in support rooms or sessions (warn on detection).
- 🔒 Privacy: friends never see that you are in the support section; support activity never appears in profiles or friend lists.

---

## States to build
1. Rooms live + hosts available (full layout)
2. No rooms live, hosts available
3. Rooms live, no hosts available for one-on-one
4. Nothing available: both empty states with **Notify me** buttons; crisis button still on top
5. Room waiting for 3rd person: "Waiting for one more person to join."
6. Request pending / accepted / declined / expired
7. Session in progress (timer, 2-minute warning)
8. Host application: pending / approved / needs changes
9. Loading (skeleton rows) and error ("Couldn't load. Try again")

---

## Visual system rules (same as the rest of the app)
- **Hierarchy:** page title (largest) → crisis button → section labels → rows. Status messages ("No room is live") are body size, never title size.
- **Type scale (px):** title 30–36 · section 18–20 · body/row title 16 · secondary 14. No text under 14px.
- **Spacing (px):** 8 · 16 · 24 · 32 · 48. More space between sections than within them.
- **Buttons:** one solid primary per section (Join / Request / Notify me). The crisis button uses its own distinct, high-contrast style. Secondary actions = outline. Tertiary = text link (Report, Become a host).
- **Contrast:** 4.5:1 minimum for all text, especially grey secondary text.
- **Touch targets:** 44×44px minimum.
- **Badges:** text + icon, never color alone.
- **Tone:** calm and warm. No exclamation marks, no countdown pressure, no salesy language around prices.

---

## Launch phases (to keep it simple at the start)
**Phase 1 (build now)**
- Main support page with live/scheduled support rooms and the crisis button
- Host application (form, training, agreement, manual review)
- Trained listeners hosting free support rooms
- Notify me

**Phase 2**
- One-on-one requests (free) for Trained listeners who unlocked it
- Host profile cards, ratings

**Phase 3**
- Professional verification and paid one-on-one sessions
- Payments, payouts, refunds, earnings

---

## Summary
- **Strongest part today:** the tone and privacy promise. They make a vulnerable person feel safe.
- **Weakest part today:** it's a dead end with nothing to do and a hidden crisis link.
- **Core change:** a support hub with live rooms, available hosts, a prominent crisis button, and a simple, safe path for people to become hosts.
