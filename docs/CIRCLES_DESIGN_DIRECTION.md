# Circles: Design Direction (Lamplight)

This file is the source of truth for how Circles **looks and feels**. Read it before building or changing any screen.

- **What Circles is for:** `docs/CIRCLES_INTENT.md` wins on purpose and flow.
- **How it's built and which tools:** `docs/CIRCLES_ARCHITECTURE.md` wins on technology.
- **What to build next:** `docs/CIRCLES_BUILD_PLAN.md` wins on order. Where this file mentions phases or launch lists, the build plan decides.
- **This file** wins on colours, type, spacing, components, copy tone and accessibility.

- **Values** live in `docs/design/tokens.json`. Convert them once into a TypeScript theme file for the Expo app (for example `src/theme/tokens.ts`) and use the theme everywhere. Never type a raw colour, size or spacing value inside a component.
- **Screen-specific rules** live in `docs/design/pages/<page>.md`. When a page file and this file disagree, the page file wins for that page only.
- **Visual reference:** the screenshots in `docs/screens/` (list in `docs/screens/INDEX.md`). They show layout and colour. They were rendered with a stand-in font, so match the type sizes in this file rather than measuring letters in the pictures. Where a screenshot and this file disagree on exact values, this file and `tokens.json` win.
- **Product intent** lives in `CIRCLES_INTENT.md` (Sammy's file). If this file and the intent disagree on purpose or flow, the intent wins; this file wins on visual style.
- **Do not change this file** without Sammy's go-ahead. If something is missing, ask, then add it here so every screen gets it.

Version 2 came from a full Refactoring UI review. In one line: warm greys instead of plum, one accent instead of three, a rounded font, strict scales, fewer boxes, and the room drawn as a circle of seats.

---

## 1. Personality

Talking to strangers at night should feel like sitting around a lamp with a few friends, not standing on a stage.

| We are | We are not |
|---|---|
| Warm, calm, welcoming | Loud, hyped, gamified |
| Night-first: easy on tired eyes | Bright white, high-glare, cold blue-grey |
| Kind and plain-spoken | Clinical, legal, or jokey about pain |
| Private by default | Public scores, counts, rankings |

Seven rules that apply to every screen:

1. **One ember per screen.** Ember marks the single most important action. If two things are ember, one is wrong. The active nav tab is not ember.
2. **Never colour alone.** Speaking, muted, selected, moods and warnings always carry an icon and a word as well as a colour.
3. **Red only on confirm.** Leave, Block and Report entry points are quiet. Red appears inside the confirm step or for real warnings.
4. **44 px or bigger.** Every tap target. At least 8 px between targets.
5. **Nothing chosen for them.** No pre-selected moods, thank-yous, saves or opt-ins.
6. **Space before boxes.** Group things with spacing first. Add a surface only when space isn't enough. Never put a box inside a box inside a box.
7. **Say it like a person.** No "Label: value" or "A · B · C" strings. Write "Hosted by Tolu", "4 seats open", "Friday at 10 pm, your circle".
8. **Talking comes first.** Every feature (learning, games, the Table, watch-along) happens inside a room where people talk. Nothing replaces the conversation.
9. **New features go on the table, not in new tabs.** See section 1b.

---

## 1b. Product structure: how Circles grows

Circles grows from talking into learning, games and more. To keep it one app, everything is built from four blocks. Read `docs/design/pages/activities.md` before adding any feature.

| Block | What it is | Examples |
|---|---|---|
| **Room** | A live conversation now. Everyone can talk. Small on purpose. | A mood room, tonight's Igbo practice, a Ludo game |
| **Group** | People who meet again. Free, invite only, or paid with a host. Each meeting opens a room. | Night Owls, Igbo for beginners, Ludo Fridays |
| **Door** | A reason people come in, shown on Home. Each opens its own page with one "now" button and its groups. | Need someone to talk to (Come in), I'm bored (Play now), I want to talk (Talk now), Learn together (Practise now), My people (Start a room with friends) |
| **Table activity** | Something the room shares in the middle of the circle while talking. | A note or link, words for a lesson, a Ludo board, a quiz, a watch-along countdown |

Words used in the app: **room** (now), **group** (meets again). "Circles" is only the app's name. Do not use "circle" for a feature.

### Rules by kind of room

The app reads this table (store it as data, not as code branches). A new kind of room is one new row.

| Kind | People | Host | Allowed on the table | Money | Adverts |
|---|---|---|---|---|---|
| `support` (Need someone to talk to) | 3–10 | Trained host only | note, link (host can turn off) | Free | Never |
| `talk.mood` (Want to laugh, Need advice, Just chat) | 3–6 free, up to 10 hosted | Optional | note, link, quiz, turns | Free | Never |
| `talk.topic` (incl. debate, faith, politics) | 3–6 free, up to 10 hosted | Optional | note, link, photo, turns | Free | Never |
| `learn.practice` | 3–7 | Optional | note, link, words | Free | Undecided; never inside a room |
| `learn.class` | usually 10, max 12 | Verified host | note, link, photo, words, quiz | Monthly fee set by host; Circles takes a cut | Never for paying members |
| `play` (I'm bored) | 3–6 (2 for Chess or Draughts) | Optional | games, quiz, watch-along | Free | Undecided; never inside a room |
| `private` | 3–6 | Creator | whatever its kind allows | Free | Never |

### Phases (product shape only)

The order of building is decided by `docs/CIRCLES_BUILD_PLAN.md`, not by this list. Use this list to know where a feature belongs, not when to build it.


1. **Launch:** Home with doors; support rooms with trained hosts; I want to talk (moods and topics); I'm bored with Find the Impostor, Mafia and Ludo; My people; Learn together with free practice groups; link-first join in the browser; safety and the moderation console. The table slot and activity framework are part of launch, because games need them.
2. **Next:** Whot, Draughts, Chess in teams, Ayo; the Table (notes, links, photos); Draw and Guess and prompt games; paid hosted classes; Circles Plus.
3. **Later:** partner game makers, heavier games, optional video, gifts only if ever and never as status.

### Never (write these into every build)

- Never show anyone that a person is in a support room, not friends, not "in a room".
- Never put games, adverts or the Table's photos in support rooms.
- Never let a game vote, a game role or a game result remove or mute a real person.
- Never keep scores, streaks or rankings after a room ends.
- Never let someone speak before they've verified their email (phone later) and chosen a nickname, in the app or in the browser.

---

## 2. Colour

Built in HSL. Greys are tinted warm (hue 20 to 38). Darker shades lean red, lighter shades lean yellow, and saturation rises at both ends.

### Night (default)

| Token | Hex | Use | Contrast on `bg` |
|---|---|---|---|
| `bgDeep` | #17100D | Deepest shadow, rarely used | — |
| `bg` | #1F1814 | App background | — |
| `surface` | #27201B | Tiles, cards, sheets, inputs | — |
| `raised` | #322A25 | Secondary buttons, selected fill, chips | — |
| `line` | #453C36 | Input borders, dashed circle of seats | — |
| `divider` | #322A25 | List dividers, nav top border | — |
| `seatEmpty` | #5F564F | Dashed empty seats, sheet handle | — |
| `disabled` | #90857A | Disabled controls only, never text | — |
| `textMeta` | #AEA498 | Times, hosts, helper text, placeholders, inactive nav | 7.1 : 1 (5.7 on `raised`) |
| `textSoft` | #CDC3B7 | Body copy under headings, quiet buttons | 10.1 : 1 |
| `text` | #F5EFE5 | Headings, names, labels, **selected border** | 15.3 : 1 |
| `ember` | #F4A14E | The one main action | 8.4 : 1 |
| `onEmber` | #20140E | Text and icons on ember | 8.6 : 1 on ember |
| `emberText` | #F9BC6C | Ember-coloured text: "Hand up", "Thank-you sent" | 10.4 : 1 |
| `emberSoft` | #4A2B1C | Ember badge background (hand up, host chip) | — |
| `emberTint` | #362017 | Very soft ember fill | — |
| `live` | #54C99A | Live, speaking, success | 8.5 : 1 |
| `liveSoft` | #1A322A | Live tint | — |
| `danger` | #F0786A | Report confirm, remove, real warnings | 6.3 : 1 |
| `dangerSoft` | #371C1B | Danger tint | — |
| `scrim` | rgba(15, 10, 8, 0.64) | Behind sheets and dialogs | — |

Three text levels only: `text`, `textSoft`, `textMeta`. Make secondary text lighter, not smaller.

There is **no second accent colour.** Selection uses `text` (see Selected in section 6). Links are `text` with an underline.

### Day (setting)

| Token | Hex | Contrast on `bg` |
|---|---|---|
| `bg` | #F9F6F1 | — |
| `surface` | #FFFFFF | — |
| `raised` | #EFE9E1 | — |
| `line` | #DAD2C8 | — |
| `divider` | #E8E1D9 | — |
| `disabled` | #988E86 | never text |
| `textMeta` | #70655C | 5.3 : 1 (4.7 on `raised`) |
| `textSoft` | #5B5048 | 7.3 : 1 |
| `text` | #261D17 | 15.3 : 1 |
| `ember` (fill) | #F4A14E | `onEmber` #20140E on it: 8.6 : 1 |
| `emberText` | #9C4B1C | 5.7 : 1 |
| `emberSoft` | #FBE7D0 | `emberText` on it: 5.1 : 1 |
| `live` | #14714C | 5.6 : 1 |
| `liveSoft` | #DAF1E8 | `live` on it: 5.1 : 1 |
| `danger` | #B4362D | 5.6 : 1 |
| `dangerSoft` | #FAE7E5 | `danger` on it: 5.0 : 1 |

### Mood colours

Mood colour appears **only on the small mood icon** (and the mood chip in a room). Tiles and rows stay neutral.

| Mood | Icon | Night icon / chip bg | Day icon / chip bg |
|---|---|---|---|
| I'm down | moon | #94B7E6 / #212B3B | #3E64A8 / #E6EEFB |
| Just bored | coffee cup | #D7BC8E / #392F23 | #76591B / #F5EEDC |
| Want to laugh | smile | #F3D05E / #39311D | #735C00 / #FBF3D2 |
| Need advice | lightbulb | #92C99F / #233427 | #2F7A43 / #E3F3E7 |

Topics (Business, Ideas, Tech, Faith, Relationships, Exams, New in the city) use `textSoft` icons. They do not get colours.

### Avatar tints

An initial on a tint. Pick from the user id with a stable hash, never at random per render. All letter/background pairs are 7.5 : 1 or better.

| Background | Letter |
|---|---|
| #3B2722 | #F2B39A |
| #1A322A | #8FD6B4 |
| #212B3B | #A9C4EA |
| #392F23 | #E3C893 |
| #352230 | #E6AFD2 |
| #2C2D22 | #CFD38E |

---

## 3. Typography

**Family:** Nunito (Google Fonts, free, open licence; in Expo, load it with the Expo Google Fonts package for Nunito). It's rounded and warm, which suits a friendly product, and it has eight weights. Bundle the font files with the app; do not load them at runtime. Fallback: the platform's system sans.

Six sizes only, from the scale **12, 14, 16, 18, 24, 30**, plus **48** for one thing only: the big word or number at the centre of a game card (a secret word, a dice result, a countdown).

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 30 / 34 | 800 | Screen questions and big titles ("How are you feeling tonight?") |
| `title` | 24 / 30 | 800 | Room titles, sheet names, secondary screen titles |
| `heading` | 18 / 24 | 800 | Section headings ("Coming up"), primary button label |
| `body` | 16 / 24 | 400 | Paragraphs, chat, helper paragraphs |
| `bodyStrong` | 16 / 22 | 700 | Names, row titles, tile labels |
| `meta` | 14 / 20 | 400 | Times, hosts, seats, helper lines |
| `metaStrong` | 14 / 20 | 700 | Secondary button labels, chips |
| `tiny` | 12 / 16 | 700 | Nav labels, "Speaking", "Hand up" under avatars |

Rules:
- Body is 16 px. Nothing below 12 px.
- Weights in use: **400, 700, 800**. Nothing below 400.
- **No all-caps labels.** Section titles are sentence case at `heading`.
- Tighten `display` slightly (-0.01em). Everything else at normal tracking.
- Left-align by default. Centre only short headings and lines on empty, waiting and help screens.
- Use tabular figures for times, countdowns and seat counts.
- Respect the phone's text size up to 130%; layouts wrap, never clip.

---

## 4. Space, shape, depth

**Spacing scale (px): 4, 8, 12, 16, 24, 32, 48.** Nothing in between. If something needs more space, take the next value; if it's clearly not enough, jump two.

| Use | Value |
|---|---|
| Icon to its label | 4–8 |
| Inside a small group (title + meta) | 4 |
| Between tiles, rows, buttons | 12 |
| Inside cards and tiles | 16 |
| Screen side margin | 24 |
| Between sections on a screen | 32 |
| Large breaks (board layouts) | 48 |

Space between groups is always clearly larger than space inside a group.

**Radius, by role:** 12 small (inputs, swatches), 20 tiles and cards, 28 sheet top corners, pill (999) for buttons, chips and avatars. Do not use any other radius.

**Depth: light comes from above.**

| Level | Recipe | Use |
|---|---|---|
| Flat | none | Text, lists on `bg` |
| Raised | `surface` fill + `inset 0 1px 0 rgba(255,236,214,0.06)` | Tiles, cards, secondary buttons |
| Sheet | `surface` fill + `inset 0 1px 0 rgba(255,236,214,0.08), 0 -16px 48px rgba(0,0,0,0.45)` | Bottom sheets, dialogs |
| Glow | `inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px rgba(244,161,78,0.22)` | **The primary button only** |
| Speaking | `0 0 0 4px bg, 0 0 0 7px live, 0 0 24px 8px rgba(84,201,154,0.25)` | The avatar of whoever is talking |

In Day, raised surfaces use a 1 px `line` border instead of the highlight, and the glow is halved.

**Sizes:**

| Element | Size |
|---|---|
| Primary button height | 56 |
| Mic control height | 64 |
| Secondary button height | 44–48 |
| Icon button | 44 × 44 |
| Bottom nav height | 76 (plus safe area) |
| Avatar in the room circle | 64 |
| Avatar in lists | 44 |
| Avatar in profile sheet | 64 |
| Mood tile | 88 tall on Home, 64 on Talk now |

---

## 5. Icons

- One line-icon set: **Lucide** (open source; `lucide-react-native` in the Expo app). 24 px grid, **2 px stroke**, round caps and joins (matches Nunito's rounded ends).
- Sizes: 24 standalone and nav, 20 in buttons, 16 in meta lines, 12 in avatar badges.
- Icons next to text use `textSoft` or `textMeta` so they don't outshout the words. Mood icons use their mood colour.
- **Never use emoji as icons.** Emoji are fine in chat.
- Icon-only buttons always have an accessibility label.

Core icons: home, dice (I'm bored), message-circle (I want to talk), book (Learn together), two circles (My people), heart (support), bell, mic, mic-off, hand, message-circle, log-out (Leave), flag (Report), ban (Block), bookmark (Save), heart (thank-you, help), shield (trained host), lock (private), clock, phone, x, chevron-down (minimise), chevron-left (back), check, plus, alert-triangle, audio-lines (speaking).

---

## 6. Components

### Buttons, by importance

| Variant | Look | When |
|---|---|---|
| Primary | `ember` fill, `onEmber` text 18/800, 56 tall, pill, Glow | The one main action on a screen |
| Secondary | `raised` fill, `text` 14/700, 44–48 tall, pill, Raised highlight | Join, Remind me, Save, Call |
| Selected | `raised` fill, **2 px `text` border**, check icon, 800 weight | Saved, Reminder set, the chosen mood |
| Quiet | Text only in `textSoft` 16/700, optional icon | Block, Report (entry), Leave on calm screens |
| Link | `text` 700 with underline (offset 4 px) | Room rules, Get help |
| Danger | `danger` fill, `onEmber` text | Only inside a confirm sheet |

States: pressed (darken fill 8%), disabled (`disabled` colour, not tappable), loading (spinner replaces the label, width stays).

### Selected state
One look everywhere: 2 px `text` border, `raised` fill, and a check. On mood tiles the check sits in a 24 px `text` circle at the top-right corner with a 4 px `bg` ring. Never use colour alone for selection.

### Mood tile
`surface` fill, radius 20, Raised highlight, 16 padding. Mood icon (24, mood colour) and label (`bodyStrong`). No icon box. On Home the icon sits above the label; on Talk now they sit side by side. Radio group for screen readers.

### Chip
32 tall pill, 12 side padding, icon 16 + `metaStrong`. Mood chips use the mood chip colours; "Trained host" uses `live` / `liveSoft`. Not tappable.

### The room circle (signature element)
People sit on a ring, not in a grid.
- A 248 px dashed ring (`raised` colour, 2 px) with up to 6 seats on it at 60° steps, starting at the top. For rooms of 7–10, use two rings or a 10-seat ring at 48 px avatars.
- In the centre: a soft ember glow (radial, 20% at the centre fading to 0 at 70%) with "6 here" (`heading`) and "4 seats open" (`meta`).
- Each seat: 64 px avatar, name (`metaStrong`), and a status line (`tiny`) only when there is something to say: "Speaking" (`live` + audio-lines icon) or "Hand up" (`emberText`). Your own seat is labelled "You".
- Badges bottom-right, 24 px with a 2 px `bg` ring: mic-off (`raised` / `textSoft`), hand (`emberSoft` / `emberText`).
- The speaker gets the Speaking glow from section 4.
- Empty seats: 2 px dashed `seatEmpty` circle with a plus.
- The same drawing is reused, smaller, on Room drops to 2, Nobody here yet and the welcome screen.

### The table slot
The middle of the room circle. In Version 1 it shows "6 here / 4 seats open". When something is put on the table:
- The seats move up into a gentle arc of 44 px avatars across the top (speaker keeps the Speaking glow; teams show a 2 px team-colour ring plus the team name and icon).
- The item appears below as a **table card**: `raised` fill, radius 20, 24 padding, Sheet-level shadow plus a faint ember glow (`0 0 48px 8px rgba(244,161,78,0.10)`), so it reads as lit by the lamp.
- The card header says who put it there ("Bayo put a note on the table") with a 44 px options button (Take it off the table, Report).
- Games and other activities draw only inside the card area. Seats, mic and the bottom row never move or hide.
- Photos and screenshots are blurred until each person taps them.

### Room bottom row
Four equal buttons, 56 tall, radius 20, icon over a `tiny` label: **Raise hand, Chat, Table, Leave**. During an activity the third button becomes **Leave game** (members) or **End game** (host). The mic control sits under the row.

### Table action button
For actions inside a table activity (Bring out a token, Reveal answer, Start countdown): `text` fill, `bg` text, 48 tall, pill, 16/800. It's strong but not ember, so the mic stays the room's one ember action.

### Segmented control
Used for small switches inside a door page (for example levels in Learn). `surface` track, 4 px inset, pill. Selected segment: `text` fill with `bg` text, 800. Others: transparent, `textSoft`, 700. Acts as tabs for screen readers.

### Price
Shown only on paid group pages and the payment sheet, never in rooms or lists of free things. Amount in `title` (24/800), period in `body` `textSoft` ("a month"). Always next to "Cancel any time". Use the placeholder `[PRICE]` in designs until the host sets it.

### Mic control
64 px pill at the bottom of the room.
- **Muted (default on join):** `ember` fill with Glow, mic-off icon, "You're muted" (18/800) / "Tap to talk" (14).
- **Live:** `liveSoft` fill, 2 px `live` border, mic icon, "You're live" / "Tap to mute".
- **Paused by the room:** `raised` fill, disabled, "Mic paused" / reason.
- Haptic tick on every change.

### Row (lists)
44–48 px leading element (avatar, time, or mood icon in a circle) · title `bodyStrong` · meta line `meta` in `textMeta` · trailing action (secondary button 96 wide, or 44 icon button). 12 vertical padding, no card behind it. Dividers only when rows have no trailing button.

### Circle card ("Your circles")
`surface` card, radius 20. Leading date block: day ("Fri", `metaStrong`, `textMeta`) over time ("10pm", `heading`). Title, meta ("In 6 days, with 7 regulars"), reminder icon button.

### Bottom navigation
Removed. Circles has no tab bar (see section 9). The only thing pinned to the bottom of pages is the room bar while you're in a room.

### Bottom sheet
`surface`, 28 px top corners, 40 × 4 handle in `seatEmpty`, Sheet depth, `scrim` behind. 24 side padding, 24 between groups. Destructive confirms can't be dismissed by tapping the scrim.

### Text input
Visible label above (`bodyStrong`), 56 tall, `surface` fill, 2 px `line` border, radius 12. Placeholder in `textMeta`. Focus: 2 px `text` border. Helper line under it in `meta` with a 16 px icon. Error: `danger` border, alert icon and message directly under the field.

### Switch
52 × 32. On: `text` track, `bg` knob. Off: `raised` track, `textMeta` knob. Always with a text label; the whole row is tappable.

### Help link (support rooms)
Not a banner. One quiet row: heart icon in `#F2B39A`, "Need more than a chat tonight?" in `textSoft`, and "Get help" as a Link. 48 px tall.

### Toast
Above the nav, 3 seconds, `raised` with `text`. "Reminder set", "Saved. You'll connect if they save you too."

### Empty state
The circle-of-seats drawing (or another simple shape drawing), one `title`, one `body` line in `textSoft`, one primary action. Never blank.

### Skeleton
`raised` shapes matching the real content; gentle shimmer, off with reduced motion.

---

## 7. Motion

| Token | Duration | Use |
|---|---|---|
| `fast` | 150 ms | Press, toggles, selection |
| `base` | 250 ms | Sheets, tab content, toasts |
| `slow` | 350 ms | Entering and leaving a room |

- Ease-out entering, ease-in leaving.
- The speaking glow breathes gently while someone talks and fades within 200 ms when they stop.
- The centre glow of the room is still. One moving thing at a time.
- Reduced motion: no shimmer, no breathing glow, cross-fades instead of slides.

---

## 8. Voice and copy

- Second person, short, warm. "You're muted", not "Microphone disabled".
- One question per screen. "How are you feeling tonight?"
- Buttons say exactly what happens: "Move me to another room", "Tell me when two more join", "Find my room".
- Say what happens next. "If nobody joins, we'll move you both to open rooms."
- Never blame. "You were removed from this room."
- Plain phrases instead of formulas: "Hosted by Emeka", "4 seats open", "In 6 days, with 7 regulars". No middle dots between facts.
- Activity, never status: "38 people are talking right now", never follower counts.
- Calm words at sensitive moments. No jokes, no exclamation marks.
- Times: "9 pm", "Tonight at 9 pm", "Friday at 10 pm". Lower-case am/pm, minutes only when needed ("9:30 pm").
- Bracketed placeholders (e.g. `[VERIFIED NIGERIA CRISIS LINE]`) must be replaced before release; the build should fail if any remain.

---

## 9. Navigation

- **No tab bar.** Home is the house; every door is visible on it. Each door opens its own page; back always returns Home.
- **Home, top to bottom:** greeting with the bell and your avatar (Me); the question "What brings you in tonight?"; the **support line** ("Need someone to talk to? Come in"); four door tiles in a 2 × 2 grid (I'm bored, I want to talk, Learn together, My people); Coming up; a quiet "38 people in rooms right now".
- **The support line** is always first under the question, on every visit, in the same place. Warm tint (`emberTint`), heart icon, "Come in" in `emberText` with a chevron. Gentle, never an alarm, never moved below games.
- **Door pages** share one shape: title, one line, one ember "now" button with a helper line, then ways to browse, then "Start one" as a quiet link. See `docs/design/pages/doors.md`.
- **Me** opens from the avatar at the top of Home: profile, saved people, thank-yous, settings; later payments, Circles Plus, host tools.
- **The room is a layer above everything**, full screen. Minimise shrinks it to a room bar at the bottom of every page; the room keeps running.
- One **Start** flow for everything, reached from each door.
- Notifications and invite links open the exact screen they refer to, even from a cold start, in the app or in the browser.

---

## 10. States every screen must handle

- **Loading** — skeleton in the shape of the content.
- **Empty** — empty-state pattern with a next step.
- **Error** — plain sentence + "Try again". Keep what the user typed.
- **Offline** — "You're offline. Rooms need a connection." Disable joining, keep cached lists.
- **Long text** — names up to 20 characters, titles up to 40, short lines up to 80.
- **Large text** — 130% text size.
- **Day theme** — check once in Day.

---

## 11. Accessibility checklist

- Text contrast 4.5 : 1 or more. All text tokens above pass on the surfaces they're meant for; `disabled` is never used for text.
- Every icon-only button has a label. Decorative icons are hidden.
- The room circle announces each seat: "Tolu, host, speaking", "Bayo, muted", "Chi, hand up".
- The mic control announces changes ("You're live").
- Mood tiles are a radio group; switches are switches.
- Focus order follows the visual order. Nothing is hover-only.
- Never colour alone.

---

## 12. Screens and where their rules live

| Screen | Reference |
|---|---|
| Every designed screen | `docs/screens/` (see `docs/screens/INDEX.md` for which build step each belongs to) |
| In a room (host view), Raised hands, Host actions, Host leaving, Minimised bar | `docs/design/pages/room-host-view.md` |
| Report flow, Block confirm | `docs/design/pages/report-and-block.md` |
| You were removed, Warning notice, Account suspended | `docs/design/pages/removed-warned-suspended.md` |
| Home doors, every door page, matching | `docs/design/pages/doors.md` (Talk room lists in `docs/design/pages/live.md`) |
| Join from a link in the browser | `docs/design/pages/link-first.md` |
| Start something | `docs/design/pages/start-something.md` |
| How features plug in; Put on the table; every activity | `docs/design/pages/activities.md` |
| Learn space, language pages, Practise now, Igbo app link | `docs/design/pages/learn.md` |
| Paid groups, payments, Circles Plus, host earnings | `docs/design/pages/paid-groups.md` |
| Play space, games, watch-along, quiz, take turns | `docs/design/pages/play.md` |
| Room preview | `docs/design/pages/room-preview.md` |
| Notifications | `docs/design/pages/notifications.md` |
| Group detail (was Circle detail) | `docs/design/pages/circle-detail.md` (same page shape for every group; paid version in `docs/design/pages/paid-groups.md`) |
| Starting soon (group lobby) | `docs/design/pages/starting-soon.md` |
| Manage group (was Manage circle) | `docs/design/pages/manage-circle.md` |
| Welcome | `docs/design/pages/welcome.md` |
| Age check | `docs/design/pages/age-check.md` |
| Microphone permission | `docs/design/pages/mic-permission.md` |
| Moderation console | `docs/design/pages/moderation-console.md` |
| Everything else (settings, account, sign-up steps, chat sheet, invites, saved people, system states) | This file; follow the closest designed screen and the rules above |

Page files were written before version 2. Where they mention old token names, read them as: `teal` → `live`, `tealSoft` → `liveSoft`, `violet` → `textSoft` (icons) or Selected (choices), `violetSoft` → `raised`, `textFaint` → `textMeta`, "banner" for the help link → the Help link component.

---

## 12b. Arrangement rules (learned from the intent screens)

1. **Content flows from the top.** Use steady 32 / 48 px gaps between sections. Pin only the main action (and the room controls) to the bottom. Never pin a stray line of text to the bottom; it leaves a dead gap mid-screen.
2. **Tiles in a grid share one structure.** Icon tile at the top, title plus one short line at the bottom. Descriptions fit on one line (cut with an ellipsis if a name is long) so titles line up across columns.
3. **Icons in tiles are enclosed.** 20 px icon in a 40 px tinted square (radius 12). Never a bare icon scaled up to fill space.
4. **Small toggles show state with the icon.** A reminder bell is outline when off and filled when on, with no ring. The 2 px warm-white ring is only for choices with words (Saved, a picked mood, a radio card).
5. **Stand out by place before colour.** The support line is the same surface as the doors, full width, first, with a soft lamp glow. Don't make it a coloured block.
6. **No shapes that look like missing content.** Avatars always have an initial or picture; empty seats are dashed and labelled.
7. **Write copy for the space.** If a line wraps leaving one word on its own, shorten it. Rows and tiles get one line of detail.
8. **Centre the main thing in leftover space.** On game and invite screens, centre the card or picture between the header and the controls.

## 13. Before handing a screen to Sammy

- [ ] Theme tokens only; no raw values
- [ ] At most one ember element (plus its glow)
- [ ] Spacing, font sizes and radii only from the scales above
- [ ] No box inside a box inside a box
- [ ] No all-caps labels, no "A · B · C" strings
- [ ] Rendered and checked: nothing floating at the bottom, titles aligned, no one-word lines (section 12b)
- [ ] Every target 44 px or more
- [ ] Nothing pre-selected
- [ ] Loading, empty, error and offline states present
- [ ] Checked at 130% text size and in Day theme
- [ ] Screen-reader labels on icon buttons and the room circle
- [ ] Reduced motion respected
