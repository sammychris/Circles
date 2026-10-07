# Activities and the table (how new features plug in)

**Kind:** framework + 1 sheet + table card states · **Release:** slot in V1, first activities in Phase 2 · **Read this before adding any feature to rooms.**

## Why
Circles will grow: notes, lessons, games, quizzes, watch-alongs, maybe creators' games. If each one gets its own screen or room type, the app splits apart. Instead, every one of them is an **activity** placed on **the table** (the middle of the room circle). The room, its seats, mic, chat, report and leave never change.

## The activity contract
Every activity, built by us or by an outside creator, is registered with this description (store as data):

```
id               "ludo"
name             "Ludo"
group            "share" | "together" | "games"
icon             lucide icon name
oneLine          "Two teams, 2 to 6 people"
allowedKinds     ["play"]                     // from CIRCLES_DESIGN_DIRECTION.md › Rules by kind of room
players          { min: 2, max: 6, teams: true }
mode             "turn-based" | "host-led" | "external"
whoCanStart      "anyone" | "host"
needsHost        false
dataUse          "low"                         // must work on weak mobile data
version          "1.0.0"
enabled          true                          // switchable per country from the console
```

Extra capabilities an activity can ask for:

```
privateInfo      true      // each person sees their own card, role or hand only (Impostor, Mafia, Whot)
voting           true      // the room votes inside the game (never affects real membership)
phases           ["describe","vote","reveal"]   // with timers; the room shows the current phase
pausesMics       false     // only for short secret phases (Mafia night), max 20 seconds, always shown on screen
```

Rules every activity must follow:
1. Appears only in rooms whose kind allows it. Games never in `support` rooms.
2. Draws only inside the table card. Seats, mic control and the bottom row stay visible and working.
3. Uses the room's voice, chat and report. No separate chat, no separate profiles.
4. Anyone can leave the activity without leaving the room. The host (or the person who started it, in unhosted rooms) can end it for everyone.
5. No in-app purchases, no adverts, no scores or rankings kept after the room ends. Votes, roles and results never remove, mute or report a real person.
6. Turn-based or host-led only on the table. Fast real-time games are `external` (game nights: everyone plays on their own device).
7. Works on weak connections: small download, state synced as small messages, survives a 30-second reconnect.
8. Accessible: every board or card has a text description for screen readers and is usable without colour.

Outside creators: same contract, plus review by the Circles team before `enabled` is switched on, and a kill switch in the console.

## Put on the table (sheet)
Opened from the **Table** button in the room's bottom row.
- Title "Put on the table", line "Everyone sees it while you talk. You only see what this room allows."
- Sections in this order: **Share** (note or link, photo or screenshot), **Do together** (take turns, quiz, watch along), **Games** (Ludo, chess in teams, later others).
- Each row: 44 px icon tile (`raised`, radius 12; games may use their mood/team tint), name (`bodyStrong`), one line (`meta`).
- Only activities allowed in this room appear. If none are allowed beyond notes, the sheet shows just Share.
- Some activities can be host-only; members see them with "Ask the host" instead of starting.
- Only **one thing is on the table at a time**. Starting a new one asks "Replace what's on the table?" (Replace / Cancel).

## Table card states
| State | What shows |
|---|---|
| Empty (V1 default) | The circle of seats with "6 here / 4 seats open" in the middle |
| Note or link | Header "Bayo put a note on the table", text up to 500 characters; links show title and site name only, opened in a browser on tap |
| Photo | Blurred with "Tap to see" until each person taps; host can take it down |
| Words (learn) | A list of up to 10 words or phrases with translation; host can reveal one at a time |
| Take turns | Speaking order with the current speaker highlighted and a gentle timer (1, 2 or 3 minutes); "Pass" button for the speaker |
| Quiz | Question, 2 to 4 answers; everyone answers privately; host reveals; no running scoreboard |
| Watch along | Title (typed by the host), "Starts in 0:10", then "Press play now". Nothing is streamed |
| Game | The game's own drawing, inside the card |

## Options on a table item (sheet)
- **Take it off the table** (the person who put it there, or the host)
- **Report** (opens the report flow with the item attached)
- Nothing else. No reactions, no likes.

## Safety
- Every report automatically attaches what was on the table at that moment.
- Photos are blurred until tapped; repeat image reports lead to a photo ban for that person.
- Links open outside the app, with "You're leaving Circles" for unknown sites.
- In `support` rooms only notes and links are allowed, and the host can turn even those off.

## Data
TableItem: id, roomId, activityId, createdBy, createdAt, endedAt, payload (small JSON), reportsCount.
Activity registry: as above.
