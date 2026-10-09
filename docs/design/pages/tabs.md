# Bottom bar and the four main pages: Home, Explore, Groups, Me

**Kind:** navigation + 4 screens · **Release:** after game mode · **Decided by:** Sammy, 2026-10-08
**Replaces:** "No tab bar" (`CIRCLES_DESIGN_DIRECTION.md` › 9 Navigation, and › Bottom navigation).
**Builds on these existing designs (reuse them, don't redraw them):**
- `doors.md` (Home and the door pages)
- `live.md` (open rooms list, which was a "Live tab" once)
- `circle-detail.md`, `starting-soon.md`, `manage-circle.md` (groups)
- `notifications.md`
- `start-something.md`

**Rules used:** the `ui-ux-pro-max-core` UI skill (bottom navigation has 5 tabs or fewer, back behaves predictably, deep links work, every screen has loading, empty and error states), plus the design direction.

## Why
- **Liveliness.** Sammy: "It feels like a graveyard now." People need one place showing what's live, what's on tonight, and what meets every week.
- **Reaching your own things.** Your profile, groups and reminders need to be easy to find.
- **Home stays the house.** It keeps the doors and the support line.

The split, so pages never repeat each other:

| Tab | One idea |
|---|---|
| **Home** | Come in: the doors, and what's for you right now |
| **Explore** | What's happening in Circles |
| **Groups** | What's yours |
| **Me** | You and your settings |

**Never fake activity.** Every number, room and person shown is real. When it's quiet, show what's coming next instead of an empty list.

## The bar
- **Size:** 76 tall plus the safe area (`size.bottomNav`), `surface` fill, 1 px `line` top border.
- **Tabs:** four equal tabs. Each has a 24 px icon over a `tiny` label.
  - Home: `home`
  - Explore: `compass`
  - Groups: `users`
  - Me: your own avatar at 24 px, with an initial if there's no picture
- **Selected tab:** `text` icon and label, label in 800 weight, and a 24 × 4 pill indicator above the icon.
- **Other tabs:** `textMeta`. Never colour alone: the selected tab also has the pill.
- **Unread dot:** an 8 px `ember` dot on Groups when there's a new invitation or a group starts soon.
- **Shown on:** the four main pages and the pages opened from them (door pages, group detail, notifications).
- **Hidden on:** rooms, sign-up, Start something, and sheets.
- **When you're in a room**, the minimised room bar sits directly above the tab bar.
- **Back:**
  - Android's back on Explore, Groups or Me goes to Home.
  - On Home it leaves the app.
  - Tapping the tab you're already on scrolls that page to the top.
- **Screen readers:** each tab is a tab, e.g. "Explore, tab, 2 of 4".

## Home (keep `doors.md`, with these changes)
1. **Top:**
   - The greeting and the bell stay.
   - The avatar leaves the top right, because Me is a tab now.
2. **Unchanged:** the question, the live line, the support line (always first under the question, never moved, hidden or shrunk), and the four doors.
3. **Go back in** (new, only when it applies): one row for a room you left in the last hour that's still open. Room title plus "4 people still here", with **Go back in** (Secondary). Never for support rooms. Shown only to you.
4. **For you** (new, up to 2 rows, hidden when there's nothing):
   - Open rooms like ones you joined before: same door and mood, topic, or language and level.
   - It uses your own room history, kept on your phone, from your last 5 rooms. Support rooms are never used and never suggested.
   - Each row is a room row with a reason line: "Like your Ludo room yesterday", or "Igbo, Beginner, like you".
   - If nothing is open now, it shows the next scheduled room of the same kind instead, with Remind me.
5. **Coming up:** as designed. Up to 2 rows, then "See all" (opens Explore › Tonight).
6. **Keep Home short.** For you is the only recommendation block on Home. No feeds and no endless lists; browsing all rooms belongs in Explore.

## Explore ("What's happening")
- **Top:**
  - Title **Explore** (`title`) and the line "What's happening in Circles".
  - A search icon is added later, when there are many rooms. It isn't shown now.
- **Filter chips** (sticky under the title, horizontal scroll, single select, as in `live.md`): All, Talk, Play, Learn, then topics. "All" is selected first.

Sections, top to bottom, 32 apart:

1. **Live now**
   - Activity line: live dot plus "38 people in 9 rooms".
   - Up to 5 room rows (as in `live.md`), sorted by:
     1. rooms with free seats first;
     2. the most people talking;
     3. the newest.
   - "See all 9" opens the full list, filtered.
   - **Empty:** "It's quiet right now." plus the next scheduled room ("Next up: Ludo night, 8 pm" with Remind me) and **Start a room** (Secondary).
2. **Tonight**
   - Scheduled rooms later today: a time block ("8 pm"), title, host, how many are going, and a **Remind me** bell (outline when off, filled when on).
   - Tomorrow's appear after 9 pm.
   - **Empty:** "Nothing scheduled tonight. Start one and people can set a reminder." plus **Schedule a room**.
3. **Every week**
   - Regular groups, shown as group cards (`circle-detail.md`): "Igbo practice. Tuesdays and Thursdays at 7 pm. 7 regulars".
   - Tap a card for its detail page, which has Join and Remind.
4. **Support rooms are never listed in Explore.** The support door on Home is their only way in.
   - Today the database already hides support rooms from room lists. Keep it that way.

**Loading:** skeleton rows in the shape of the content. **Error:** "We couldn't load what's happening. Check that you're online." plus Try again. **Offline:** show the last list with "You're offline".

## Groups ("What's yours")
- Title **Groups** (`title`).
- **Start a group** is the one ember button on this page, under the title. It opens Start something with "Every week" ready, as in `start-something.md` and `manage-circle.md`: name, purpose, days, time, who can join.

Sections, top to bottom:

1. **Next up:** your next scheduled room or group. A big time ("Tonight at 7 pm" or "In 25 min"), the title, and **Go in** (opens Starting soon from 5 minutes before) or **Remind me**.
2. **Invitations:** "Ada invited you to Ludo", with **Join** (Secondary) and **Not now** (Quiet). They expire when the room ends.
   - Only your mutual connections can invite you.
   - Invitations can never come from support rooms.
3. **Your groups:** group cards for the groups you joined or started, plus **Manage** for groups you host.
4. **My people:**
   - A row of avatars of people who saved each other with you, plus "and 4 more".
   - **Start a room with friends** opens the existing flow.
   - "On now" follows `doors.md` › My people exactly: friends are shown in a public room only if they allow it, and someone in a support room shows only as "Online, not in a room".
5. **Your reminders:** rows with a time and a filled bell. Tap the bell to remove one.

**Empty (new person):** "Your groups and reminders will show here." with **Explore groups** (Secondary). The Start a group button stays above it.

**Needs:** scheduled and weekly rooms, reminders and invitations need push notifications (`expo-notifications`) plus a server job that sends them. Add Row Level Security to every new table.

## Me
- **Header:** 64 px avatar, nickname (`title`), and **Edit** (nickname and picture). No real name or phone number, ever.

Grouped lists, in this order:
1. **Your people:** "Saved each other: 6" (opens the list). "Thank-yous" (private, only you see them).
2. **Account:** "Add your email (keeps your account if you change phones)", or your email with **Change**. Log out.
3. **Sound and notifications:**
   - Game sounds (switch).
   - Notifications (opens Notification settings in `notifications.md`).
4. **Privacy:**
   - "Show friends when I'm online" and "Show which room I'm in" (both from `doors.md`).
   - The line "Support rooms are never shown to anyone."
5. **Help and safety:** Help, Room rules, Privacy Policy, Terms.
6. **App:** "Version 1.0.0, updated 8 Oct, 2:05 pm".
7. **Delete account:** `danger` text at the very bottom, with a confirm sheet (as built).

## Accessibility and states (all four pages)
- **Tap targets:** 44 or more.
- **Contrast:** 4.5:1.
- **Order:** focus order follows the screen.
- **Large text:** the tab labels still fit at 130% text size (the label may shrink to one word).
- **Loading, empty, error and offline:** every list has all four states, worded as above. Never a blank page.
