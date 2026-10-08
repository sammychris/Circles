# Game mode (a full screen for games in a room)

**Kind:** room layout · **Release:** after the open-test fixes · **Decided by:** Sammy, 2026-10-08
**Replaces, during a game only:** "Games draw only inside the card area. Seats, mic and the bottom row never move or hide" (`CIRCLES_DESIGN_DIRECTION.md` › The table slot), and the four-button bottom row.
**Applies to:** Ludo, Draughts, Chess in teams, Whot, Mafia, Find the Impostor, and every later game. Never in support rooms (they have no games).
**Rules used:** this file, `CIRCLES_DESIGN_DIRECTION.md`, `tokens.json`, `activities.md`, `play.md`, and the UI rules in the `ui-ux-pro-max-core` skill (in priority order: accessibility, touch, performance, layout, type and colour, motion, navigation).

## Why
Phone testing showed the problems:
- The game sat inside the scrolling room page, so tapping or dragging a piece scrolled the page.
- The board was too small (35-point squares).
- Moves felt slow.
- There was no sound or movement.
- **Leave** sat in the same row as the game, where it was easy to tap by accident.

A game needs the whole screen, but voice still comes first.

## When it starts and ends
- Game mode starts on every phone when a game goes on the Table. It ends when the game is taken off, or when you leave the game or stop watching it.
- **Going in:**
  - The seats shrink up into the face strip and the board grows into place (`motion.slow` 350, `easeOut`).
  - With Reduce motion on, it fades instead (`motion.base`).
- **Coming out:** the same movement in reverse, ending on the normal room circle.

## Layout (top to bottom, nothing scrolls)
Measured for the smallest common Android phone (360 × 740 points). Larger phones get a bigger board.

| Part | Size | What it shows |
|---|---|---|
| **Face strip** | 56 tall | Up to 10 avatars at 32 px in one row, overlapping by 8 if needed. The speaker keeps the Speaking glow, scaled down. Team games add a 2 px team ring plus the team icon. Your own avatar says "You". Tap the strip to hide it (see below). On the right: **⋯** (44 × 44, label "Room and game options"). |
| **Turn line** | 40 tall | One line, a live region: icon plus "Your team's turn", "Bayo is playing", or "Night 2. 14 seconds". `heading`, `text`. The team icon goes with the team name, never colour alone. |
| **Board** | Screen width minus 16 on each side, square. On a 360 phone it's 328, which gives 41-point squares. On 390 and up it's 358 or more, which gives 44 or more. | Centred in the space left over (Arrangement rule 8). Board games only. Whot shows the pile and market here, Mafia the role card or the vote, Find the Impostor the word card. |
| **Game controls** | Up to 140 tall | The game's own buttons and hand: Ludo dice, Chess **Agree** and **Suggest another**, the Whot hand and **Go to market**, Mafia choices. Uses the Table action button (warm white, never ember). |
| **Bottom bar** | 64 plus safe area, pinned | The **mic control** (fills the width) and a **Chat** icon button (56 × 56, unread dot). Nothing else. |

**The mic is never hidden.** Muting must always be one tap away, for safety. During Mafia's night the mic shows "Mic paused. Night", as it does today.

### Hiding the faces (Sammy's toggle)
- Tapping the strip folds it to a single 32-tall line: "6 here. Ada is speaking" (`meta`). Tap again to open it.
- When nobody is speaking, it says "6 here".
- The speaker's name always stays visible, because voice comes first.
- The choice is remembered on the phone for the rest of that game.

### The ⋯ menu (a bottom sheet)
Items in this order, one row each (44 or more tall, icon plus label):
1. **How to play**: the rules of this game in 3 to 6 short lines. New people feel at home.
2. **Hide faces / Show faces**.
3. **Sound: on / off**: a switch, remembered on the phone, also in Me.
4. **Report someone**: opens the people list, then the Report flow.
5. **Leave game** (players) or **Stop watching** (watchers) or **End game** (the person who started it).
6. **Leave room**: `danger` text, separated by a divider. Opens a confirm sheet: "Leave the room? You'll leave the game too." with **Leave** (Danger button) and **Stay** (Secondary). Tapping the scrim doesn't close it.

Raise hand isn't offered in game mode (game seats don't show hands, as now).

## Feel

### Instant moves
- Your own move shows straight away on your phone.
  - It's checked with the same game rules on your phone first, so illegal moves never even start.
  - The starter's phone confirms it.
- If the starter's phone says no, or doesn't answer within 3 seconds:
  - the piece slides back;
  - "That move didn't go through. Try again." appears under the board.
- Never a spinner on a normal move.
- **Anything random** (dice, shuffles, dealing) still comes only from the starter's phone, so nobody can cheat.
  - The dice starts rolling the moment you tap and keeps rolling until the result arrives (at least 600 ms).
  - The roll covers the wait.

### Movement
Uses the built-in React Native `Animated` with the native driver (transform and opacity only), so no new phone feature is needed.

| What | Movement | Duration |
|---|---|---|
| A piece moves (draughts, chess) | Slides to its square | 250 (`motion.base`), `easeOut` |
| Ludo token | Hops square by square | 120 per square, at most 1 s in total |
| Capture | The captured piece fades and shrinks | 250 |
| Whot card played | Flies from the hand (or the player's face) to the pile | 350 (`motion.slow`) |
| Picking up cards | Cards slide from the market into the hand | 250, 60 ms apart |
| Dice | Tumbles, then settles on the number | At least 600 |
| Your turn | The turn line and your movable pieces glow softly once | 350 |
| Game won | A soft warm glow behind the result and "Good game". No confetti storm: Circles is calm. | 1200 |

- **Reduce motion:** with the phone's Reduce motion setting on, every movement becomes a quick fade, and nothing moves across the screen.
- **Movable pieces:** these keep their 2 px warm-white ring.
- **Legal squares:** these show a 12 px dot (on an empty square) or a ring (on a capture).

### Sound
- **Where the sounds come from:**
  - A free pack with no licence trouble, such as Kenney.nl's "Casino Audio", "Interface Sounds" and "Impact Sounds" (CC0).
  - The files go in `assets/sounds/`, with the source written in `assets/sounds/CREDITS.md`.
  - Needs `expo-audio`, which is a new phone feature: one new build.
- **Each sound:**
  - Under 1 second.
  - Played at about 40% volume.
  - Mixed so it never pauses or ducks the voices.
  - Follows the phone's silent switch.

| Moment | Sound |
|---|---|
| Your turn | A soft two-note chime (only on your phone) |
| Dice roll | A dice rattle |
| Piece moves | A light wooden click |
| Capture | A firmer clack |
| Card played | A card slap |
| Going to market | A card slide |
| Mafia night falls / day breaks | A low soft tone / a light bell |
| Game won | A short warm chord |

- **Sound is never the only signal.** Every sound has a matching line of text or a movement.
- **Sound off:** when it's off, nothing plays.
- **Off by default in Learn rooms.**
- **Test on a phone:** check that the room's echo cancelling stops game sounds from going out through the mic. If it doesn't, lower the volume.

### Buzz (haptics, `expo-haptics`, already installed)
- **Light:** when you pick a piece or card.
- **Medium:** on a capture, or when you're hit (e.g. "Pick two").
- **Success:** on your turn.
- None if the phone's vibration is off.

## Each game in game mode
- **Ludo:**
  - The board fills the board area, with tokens scaled to it.
  - The dice is a 72 px warm-white tile under the board. It pulses once when it's your team's turn.
  - Safe squares show a star icon.
- **Draughts:**
  - Tap a piece then a square, or drag the piece.
  - A multi-jump shows each hop.
  - A new king gets its crown with a small flip.
- **Chess in teams:**
  - Tap and tap, or drag.
  - The last move's two squares get a faint tint.
  - The suggested move shows as a `textSoft` line from square to square.
  - Check rings the king's square and says "Check" in the turn line.
- **Whot:**
  - The board area shows the pile (a big card) and the market as a small stack with its count.
  - Your hand is a fanned row at the bottom (cards 56 × 80, overlapping when there are many). Tap a card to lift it, and tap again to play it.
- **Mafia:**
  - The board area shows your role card (with Hide) by day, and the night choices by night.
  - At night the screen dims (`scrim` over everything except the mic and the night countdown), with a moon and a countdown ring.
- **Find the Impostor:**
  - The word card is large in the board area.
  - The speaking order shows in the face strip: done (dimmed, check), talking (glow), you're next (`emberText` "Next").

## States
- **Waiting for the starter's phone** (after reconnecting): the board is greyed, with "Getting the game back…" under it (`meta`).
- **The starter has left:** "The game ended because Tolu left." and **Back to the room**.
- **Game over:** the result, "Good game. Nothing is kept: no points, no rankings.", **Play again** (starter, only with enough people), and **Back to the room** (everyone).

## Accessibility
- **Labels:** every square and card has a label ("e4, Team Sun knight, can move"). The turn line is a live region.
- **Tap size:** squares are 44 or more on most phones and at least 41 on the smallest.
- **Never colour alone:** pieces differ by shape (solid with a sun, or hollow with a cloud; outlined or solid chess symbols), and teams by name and icon.
- **Large text:** 130% text still fits. The face strip folds to its one-line form if needed.
