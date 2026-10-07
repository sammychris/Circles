# Play together (the "I'm bored" door)

Games exist to bring people together. The conversation is the real product. Use existing, proven game code plugged into rooms where possible (check each licence first: some open-source licences would require publishing Circles' own code).

## Game list (from `CIRCLES_INTENT.md`)
| When | Games |
|---|---|
| Launch | Find the Impostor, Mafia, Ludo first; then Whot, Draughts, Chess in teams as each is ready |
| Next | Draw and Guess (needs the Table), Ayo, Finish the Line, Story Chain, On the Same Wave |
| Later | Partner game makers, heavier games |

## Build by engine
| Engine | Games | Needs |
|---|---|---|
| Talk games | Find the Impostor, Mafia | Private card per person, speaking order, vote, round phases, word packs |
| Board, turn by turn | Ludo, Draughts, Chess, Ayo | Board in the table card, teams agree each move, reconnect safely |
| Cards with hidden hands | Whot | Private hand per person, shared pile on the table |
| Prompt games | Finish the Line, Story Chain, On the Same Wave | Prompt packs, take turns, a slider |
| Drawing | Draw and Guess | Shared drawing surface on the table |

## Find the Impostor
- Everyone but one gets the same secret word (Naija word packs: suya, danfo, NEPA, jollof...). The impostor's card says "You're the impostor. Listen and blend in."
- Table card shows **only your own** card: "Only you can see this", the word at 48/800, one line of rules, **Hide my word** (blurs it, for people sitting near others).
- Speaking order as an arc of seats at the top: done (check, dimmed), talking (Speaking glow, "Talking"), you're next (`emberText`).
- Each person gets about 30 seconds to describe; then **Vote**: tap the person you think is faking; reveal; next round. 3 rounds per game.
- Votes affect the game only. Nobody is removed or muted by a vote.

## Mafia
- Roles dealt privately (Mafia, Doctor, Detective, Townsperson). Night phase: Mafia choose silently on their cards while everyone's mic is paused for 20 seconds; day phase: everyone talks and votes.
- "Out" players stay in the room, keep listening, and can chat; they just can't vote. Nobody leaves the room because of the game.
- The host (or the person who started the game) can end a round that turns nasty.

## Whot
- Each person sees their own hand at the bottom of the table card; the pile and the "I need" shape are shared. Turn order around the seats.

## The door page (see doors.md)
- **Play now** (ember): joins an open game room with a free seat, or starts one.
- **Tonight**: game nights, watch-alongs, quiz nights (rows with time, title, host, Remind me).
- **Games**: rows for each enabled game with "2 to 6 people" and "Start a game room".

## Game night (external games)
A group or one-off room where everyone plays a game on their own device and talks in Circles. The table shows a card with the game's name, an optional join code typed by the host, and "Open the game" (opens the other app or site). Circles doesn't run or stream the game.

## Watch along
The host types what's being watched ("Episode 3"), people use their own TV or subscription, and the table shows a countdown: "Starts in 0:10", then "Press play now". A "Pause for everyone" button sends a pause countdown. Nothing is streamed; streaming films or matches from a phone is not allowed.

## Pick teams (sheet)
For 3 to 6 people: "Split into two teams" (random) or drag avatars between Team Sun and Team Sky. Team colours always come with a name and icon.

## Ludo on the table
- Turn-based. On a team's turn, the team talks, then one member makes the move (anyone on the team can tap).
- Seats move to the top as two team groups with team-colour rings.
- Board inside the table card (about 280 px), tokens 16 px on the path, homes 20 px. Movable tokens get a 2 px warm-white ring.
- Under the board: dice (warm-white tile), "Team Sky rolled a 6", a one-line instruction, and a **table action button** ("Bring out a new token").
- Bottom row's third button becomes **Leave game** (members) or **End game** (host).

## Chess in teams
Someone on the team drags a piece to suggest a move; teammates see "Bayo suggests Knight to f3" with **Agree** and **Suggest another**. The move is played when most of the team agrees, or after 60 seconds with the latest suggestion.

## Quiz
Host-led. The host picks a ready-made quiz or types questions. Everyone answers privately; the host reveals the answer; the table shows how many chose each answer, not who.

## Take turns
Speaking order for storytelling and debates. Current speaker highlighted, gentle timer (1, 2 or 3 min), "Pass" for the speaker, host can skip. Works in talk rooms too.

## Game over
"Good game." Shows the winning team for this game only, then **Play again** or **Back to talking**. No points, streaks or leaderboards are saved.

## Rules
- Never in `support` rooms.
- Up to 6 people in game rooms.
- No in-game purchases, no adverts inside rooms.
