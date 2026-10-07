# Home and the doors

**Kind:** Home + 5 door pages · **Release:** launch · **Replaces:** any tab bar; there is none
**Source:** `CIRCLES_INTENT.md` › "Home screen: one house, many doors"

## Home
Top to bottom (see `docs/screens/01-home.png`):
1. Greeting ("Good evening, Sammy") on the left; bell (notifications, unread dot) and your avatar (opens Me) on the right, 44 px each.
2. Question: **"What brings you in tonight?"** (`display`). Change the time word by time of day: tonight / today / this morning.
3. **Live line** under the question: live dot + "38 people are in rooms right now" (`meta`).
4. **Support line** (32 px below): full width, 80 tall, the same `surface` as the doors with a soft ember glow behind the icon (`radial-gradient(circle at 38px 50%, rgba(244,161,78,0.20) 0, rgba(244,161,78,0.07) 64px, transparent 160px)`). Filled heart in a 44 px `emberSoft` circle, `emberText`; "Need someone to talk to?" (`bodyStrong`); "Come in. It's quiet and kind." (`meta`, `textSoft`); chevron. Always first under the question. Never moved, hidden or shrunk.
5. **Four doors** (12 px below), 2 × 2 grid, 120 tall tiles, `surface`, 16 padding: a 40 px tinted icon square (radius 12, 20 px icon) at the top; title (`heading`) and one line (`meta`, never wraps) at the bottom:
   - I'm bored: dice, laugh yellow, "Play while you talk"
   - I want to talk: chat bubble, sky blue, "Topics and moods"
   - Learn together: book, sage, "Languages, skills"
   - My people: two circles, rose, "2 friends on now" (or "Friends and groups" when nobody is on)
6. **Coming up** (32 px below): up to 2 rows. Date in a 48 px `surface` square; reminder as an outline/filled bell icon, no ring.
Nothing is pinned to the bottom of Home except the room bar when you're in a room.
No ember button on Home. Each door page has its own.

## Door pages: one shape
1. Back (to Home).
2. Title and one line.
3. One ember **now** button and a helper line under it.
4. Ways to browse (rows or tiles).
5. Quiet "Start one" link at the bottom (opens Start something with this door chosen).

### Need someone to talk to (`support`)
- A filled heart in a 64 px `emberSoft` circle with a soft glow, centred, above a centred title and line. (No empty seat circles; they looked like broken images.)
- Title "Someone to talk to"; line "Quiet rooms with kind people and a trained host. No games, no rush. Listen first if you like."
- **Come in** (ember), helper "You'll join with your mic off".
- "Or pick a time": rooms open now with a trained host, and tonight's scheduled support groups (Remind).
- Directly after the list (not pinned): "In crisis right now? Get help" (opens Need more help) and, with a lock icon, "Nobody, not even friends, sees you're here".
- If no trained host is online: replace Come in with "The next room opens at 9 pm" + Remind me, keep the help link, and show the crisis line directly.

### I'm bored (`play`)
- Title "Let's play"; line "The game is the excuse. The talking is the fun."
- **Play now** (ember), helper "We'll put you in a game with free seats".
- **Talk games** (Find the Impostor, Mafia): rows with icon, one line, and "3 games on" in `live`.
- **Board and card games**: 2 × 2 tiles (Ludo, Whot, Draughts, Chess) with "In teams" or player count. Games not yet available are not shown.
- Footer: "Start a game room with friends".

### I want to talk (`talk.mood`, `talk.topic`)
- Title "Let's talk"; **Talk now** (ember) with the optional mood picker (Want to laugh, Need advice, Just chat) and optional line, as on the Version 2 Talk now screen.
- Topic rooms live now (the list from `live.md`), with filter chips for topics.
- Groups meeting tonight.

### Learn together (`learn.practice`, later `learn.class`)
- As `learn.md`: Practise now, languages, skills. At launch, free practice groups only.

### My people
- Title "My people"; **Start a room with friends** (ember): creates a private room and opens the invite sheet.
- **On now:** friends (mutual saves) who are online. Show what they're doing only if it's a public, non-support room ("Playing Ludo, 1 seat open" + Join). Otherwise "Online, not in a room" + Invite. Never reveal a support room.
- **Your groups:** rows to group detail.
- **Saved each other:** avatar row, "and 4 more" opens the full list.
- Footer promise: "Friends never see when you're in a support room."
- Settings › Privacy has "Show friends when I'm online" (on by default) and "Show which room I'm in" (on by default, never applies to support rooms).

## Matching: how each door fills rooms
| Door | Rule |
|---|---|
| Need someone to talk to | Only rooms with a trained host, up to 10. Fill the fullest room that isn't full, so nobody waits alone. No host online: next scheduled time + reminder + help line. Never an unhosted support room. |
| I'm bored | Join a game with free seats. If none, open a lobby that starts at 3 people (2 for Chess and Draughts) and lets the room vote on the game. |
| I want to talk | Mood or topic optional. Rooms of 3 to 6, or up to 10 with a host. |
| Learn together | By language and level; quiet times fall back to the next practice group. |
| My people | Private rooms by invite; friends get "Tolu started a room". |

**At launch:** schedule hosted anchor sessions for every door roughly 8 to 11 pm, so each door always has a room to walk into.

## Data
Door enum: support, play, talk, learn, people. Every room and group stores its door and kind (see CIRCLES_DESIGN_DIRECTION.md › Rules by kind of room).
