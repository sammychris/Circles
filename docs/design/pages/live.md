# Live talk rooms (inside the "I want to talk" door; formerly the Live tab)

**Kind:** section of the "I want to talk" door page · **Release:** Step 3 · **Entry:** Home › I want to talk

## Purpose
Browse every open public room. This is also where **topic rooms** live, so it is the second door in ("what you want to talk about") next to Talk now ("how you feel").

## Layout (top to bottom)
1. Under the door page's Talk now button: section title **Open now** (`heading`).
2. Activity line: live-green dot + "38 people talking in 9 rooms".
3. **Filter row** (horizontal scroll, chips, single select): All · I'm down · Just bored · Want to laugh · Need advice · Business · Ideas · Tech · Faith · Relationships · Exams · New in the city. Mood chips show their coloured icon; topic chips use a `textSoft` icon. "All" selected by default (this is a filter, not a decision on the user's behalf).
4. **Room list** (room rows, see CIRCLES_DESIGN_DIRECTION.md › Room row). Sort order:
   1. Rooms with a connection of yours in them ("Tolu is here" in `live` meta)
   2. Rooms with open seats, hosted first
   3. Newest
   Full rooms are shown last with "Full" instead of Join and are not tappable for joining (preview still opens).
5. **"Start a talk room"** quiet link at the end of the list: opens Start something (`start-something.md`) at step 2 with Talk chosen, since the person came from Talk. Creator becomes host.

Pull to refresh. The list also updates live (seats change, rooms appear) without jumping the scroll position.

## Room row details
- Title, mood/topic icon, host name or "No host", "Trained host" shield for support rooms, seats "6 of 10".
- Locked rooms don't appear. Private rooms never appear.
- Rooms with someone you blocked don't appear.

## States
- Loading: 5 row skeletons.
- Empty (no rooms at all): empty seats illustration, "It's quiet right now", "Start a room or try Talk now.", primary **Talk now**.
- Empty for a filter: "No Exams rooms are open." + **Start one** (secondary) + "Show all rooms" (tertiary).
- Offline: banner; list shows last loaded rooms greyed with "Last updated 9:41 pm".

## Accessibility
Filter chips are a single-select group with a label "Filter rooms". Each row reads "Rough day? Let's talk. I'm down. Trained host Tolu. 6 of 10 seats. Join."

## Data
Live rooms query: public, unlocked, not ended, not containing blocked users; with participant count, host, mood/topic, and whether any mutual connection is inside.
