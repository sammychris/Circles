# Link-first: joining from a link in the browser

**Kind:** web flow (6 screens) · **Release:** launch (recommended) · **Source:** `CIRCLES_INTENT.md` › Still open › Link-first access

## Why
Someone taps a friend's link and is talking within a minute, with no app store, no download and no storage space needed. The browser is the first taste; the app is for regulars.

## Build decision (before coding starts)
Rooms must run in a phone browser and in the app. Use one codebase that runs in both, not an app first and a website later. Check that the chosen voice service (LiveKit, Agora or 100ms) supports the browsers your users have.

## Screens
1. **Link preview** (screenshot: `docs/screens/16-join-from-a-link.png`). Wordmark, "In your browser" chip, "Ada_K invited you to", room or group name, one line, the small circle of seats with "4 here / 2 seats open", **Join in your browser** (ember), helper "No download. We'll text you a code to check you're a real person, then you pick a nickname. 18+ only.", quiet "I'd rather get the app".
2. **Phone number** and **text code**: same as the app.
3. **Nickname and age**: nickname, avatar colour, date of birth (18+). Accept the room rules.
4. **Microphone**: the explain-first page from `mic-permission.md`, worded for browsers ("Your browser will ask to use your microphone. Tap Allow.") with a fix-it page for each common browser if it's blocked.
5. **The room**: the same room screen, joined muted. Show a small, dismissible note once: "Keep this tab open. If your screen locks, the sound may stop."
6. **After the room**: the usual After the room, plus a card: "Keep Circles on your phone, so calls don't drop and you get reminders." **Get the app** / Not now. Never shown during a room.

## Links
- Room link: `/r/{roomId}`. If the room has ended, show the group (if any) or "This room has ended" + the nearest door's now button.
- Group link: `/g/{groupId}` → group detail.
- Door link: `/d/support`, `/d/play`, `/d/learn/igbo?level=beginner` (for the Igbo app).
- Signed-in app users who open a link go straight into the app at the same place.

## Rules
- Browser visitors are full accounts: phone-verified, nickname, 18+. No anonymous guests.
- Same safety tools: report, block, leave, help link.
- Support rooms work in the browser too; the help link is never hidden behind an install prompt.
- Never ask to install before someone has had at least one room.
- The browser version keeps no data on the device beyond sign-in; logging out clears it.

## Limits to say plainly
- Phone browsers, especially on iPhone, may cut the sound when the screen locks or another app opens.
- Reminders before groups start need the app (or browser notifications where supported).
