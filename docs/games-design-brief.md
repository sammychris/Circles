# Cycles — Games Design Brief for Codex

**Prepared:** 12 October 2026  
**Purpose:** Describe all Cycles games discussed so far, plus optional new 6–7-player competitive games requested for future consideration, so Codex can audit, prototype, and later integrate them.  
**Product:** **Cycles**, the small-room social app. **Not LocalLoop.**  
**Document type:** Product/game-design brief, **not** a claim that all features are already built or fully specified. **Revision:** adds multiplayer card games and competitive group challenges. These new games are **assistant-proposed options**, not already built or founder-approved rules.

---

## 1. What Cycles is trying to achieve

Cycles is already built. Its goal is to bring people together in small live rooms to talk, learn, play, laugh, and share experiences. Games are intended to encourage conversation and connection, not turn Cycles into a large, noisy gaming lobby.

**Room principle:** Prefer about **6–7 people** in a room. A larger limit (perhaps up to **10–12**) was only raised as a possible exception, **not** the default. Individual games may need their own player limits. People should be able to use private/invite-only rooms; solo practice can be a useful optional way to test a game, but multiplayer is the main social experience.

**Status labels used below:**

- **Built — user confirmed:** The founder says this already exists in Cycles. Confirm the implementation by inspecting the repository.
- **Seen in app testing:** Its name or entry point appeared in an earlier browser test; this does **not** prove the game is complete.
- **Future idea — user proposed:** A game concept discussed for a possible future release. Mechanics labeled *proposed* below are implementation suggestions, not approved final requirements.
- **New option — suggested for evaluation:** An additional competitive game conceived to answer the request for multiplayer cards and 6–7-person challenges; **not** presented as previously agreed or implemented.

## 2. Complete game inventory

| # | Game | Status | Key idea | Intended players |
|---|---|---|---|---|
| 1 | **Ludo** | **Built — user confirmed** | Dice-and-token board game for playing together. | Use existing supported count; commonly 2–4, but verify in code. |
| 2 | **Playing-card game** (called “What's” in speech; **possibly WHOT**) | **Built — user confirmed** | A social card game already in Cycles. | Verify current rules and count in code. |
| 3 | **Musical Chairs** | **Future idea — user proposed** | Players move around chairs while music plays; one fewer chair, elimination each round; final two compete for one seat. | Around **6–8**, with **6–7** ideal for Cycles. |
| 4 | **Raft / Platform Pushing** (working title: *Raft Rumble*) | **Future idea — user proposed** | Players push one another off a raft/platform; last player standing wins. | Around **6–7**; prototype may allow 4–8. |
| 5 | **Who Did It?** | **Future idea — user proposed** | Six-player social mystery/deduction game. Wrong accusations produce escalating **in-game** consequences and eventual elimination. | **6** in the original concept. |
| 6 | **Find the Impostor** | **Seen in app testing** | Named in Cycles' existing **Host a room** text. Exact mechanics and completed status are **not verified**. | Inspect the existing project; **do not invent or overwrite its rules**. |
| 7 | **Card Clash Seven** (working title) | **New option — suggested for evaluation** | A 6–7-person turn-based card-shedding challenge with private hands and simple rank/suit matching. | **6–7** preferred, 2–7 supported in design. |
| 8 | **Bluff Table** (working title) | **New option — suggested for evaluation** | Players make secret card claims; rivals challenge bluffs to avoid collecting a growing pile. | **6–7** preferred. |
| 9 | **Quickfire Quiz Arena** | **New option — suggested for evaluation** | All players answer the same timed trivia challenge and compete across rounds. | **6–7**. |
| 10 | **Hot Potato** | **New option — suggested for evaluation** | Rapidly pass an object before a hidden countdown expires; survive to the final. | **6–7**. |
| 11 | **Word Chain Knockout** | **New option — suggested for evaluation** | Players race to supply valid words under a short timer and changing constraints. | **6–7**. |
| 12 | **Memory Grid** | **New option — suggested for evaluation** | Briefly memorize tiles, then answer increasingly difficult recall challenges. | **6–7**. |
| 13 | **Draw & Guess** | **New option — suggested for evaluation** | One person draws a clue while others race to guess it. | **6–7**. |
| 14 | **Team Puzzle Race** | **New option — suggested for evaluation** | Small teams race to solve cooperative visual or logic puzzles. | **6–7**, with uneven-team scoring safeguards. |

**Important clarification:** *Who Did It?* and *Find the Impostor* may overlap as social-deduction concepts, but they have **not** been established as the same game. Treat them as distinct labels until the app's existing design is inspected and the product decision is made.

---

# 3. Existing game: Ludo

**Status:** Built — user confirmed. **Do not rebuild it from scratch without first checking the current code.**

### Description
Ludo is the familiar turn-based board game in which players roll dice, move their colored pieces around the board, race toward home, and interact through captures or safe squares according to the rules of the version implemented in Cycles. It is a natural fit for friendly competition in a small voice room.

### Intended Cycles experience

1. A person enters a Play room and selects Ludo, or joins a room already hosting it.
2. The room displays the available player seats and who has joined.
3. Participants play the existing implementation while optionally talking in the same Cycles room.
4. The game clearly identifies whose turn it is, the board state, and the winner.
5. People can return to the room or choose another activity after the match.

### For Codex

- Locate the existing Ludo screens, rules engine, networking, state persistence, and room integration.
- Document the **actual** supported player count, turn rules, reconnection behavior, and win condition before changing anything.
- Preserve existing progress, usernames, visual identity, and integrations.
- Look for opportunities to make **Play → Ludo → Room → Game → Results → Room** reliable, without replacing working logic unnecessarily.

**Not decided here:** Variants, private matchmaking, bots, ranking, or tournament features. They are not requirements for this handoff.

---

# 4. Existing game: Playing-card game (“What's” / possibly “WHOT”)

**Status:** Built — user confirmed. The game name was spoken as **“What's”**; it **may** refer to **WHOT**, but this must be verified from the existing app/repository.

### Description
A turn-based card game already integrated into Cycles, intended for friends to play casually while they talk. Card draws, turns, legal moves, scoring, and victory should follow the rules **already implemented** in the project, rather than a newly assumed ruleset.

### Intended Cycles experience

1. The host creates or opens a card-game room.
2. Players take their seats and see their own cards privately.
3. Shared game information (active player, played/discarded card, count/status) appears to everyone according to existing rules.
4. Each player's private hand must not be revealed to opponents.
5. The game announces its end and returns players to the surrounding social room.

### For Codex

- Inspect the repository to confirm the **exact game title and rules**.
- Keep card hands private and validate every move on the authoritative game side, not merely in the client's interface.
- Verify turn handling, reconnecting, player exit, and end-of-match results.
- **Do not assume WHOT-specific shape/number/special-card mechanics unless the existing code or product owner confirms that this really is WHOT.**

---

# 5. New game concept: Musical Chairs

**Status:** Future idea — user proposed. **This was the first new game the founder considered prototyping.**

## 5.1 Core idea — user-confirmed

A group of approximately six to eight people plays musical chairs. They move/dance around chairs or marked spots while music is playing. There is one fewer seat than the number of active players. When music stops, everyone rushes for a seat. Whoever fails to get one is eliminated. A chair disappears each round. The last two players face off over one final chair; the person who claims it wins.

The game should feel **funny, lively, short, social, and understandable within seconds**.

## 5.2 Suggested first prototype rules (proposals)

| Item | Proposed behavior |
|---|---|
| Starting count | 6 or 7 human players preferred; allow a local test mode with bots so the mechanics can be tested without recruiting a full room. |
| Seats | At round start, the number of seats is **active players minus 1**. |
| Movement | Characters automatically circle/dance around the chairs while the music plays; animated expressions make the action humorous. |
| Stop cue | Music stops at an unpredictable moment, clearly signaled visually as well as audibly. |
| Player action | On the stop cue, tap a highlighted empty chair or an obvious **SIT** control, depending on what proves fairest on mobile. |
| Elimination | Exactly one player misses a seat each normal round and becomes a spectator until the next match. |
| Next round | Remove one seat and repeat with the remaining players. |
| Final | Two active players, one chair, one winner. |
| Match length | Aim for a quick party-game match; exact round timing to be play-tested. |

**Fairness warning:** A reflex game across different phones/networks cannot safely declare winners purely by “the packet that reaches the server first.” Prototype and test an authoritative start/stop clock, latency policy, tie-breaking, and reconnect behavior. Never show one person sitting while the server declares them eliminated without clear feedback.

## 5.3 Screen and interaction ideas (proposals)

- **Lobby:** Game name, instructions, current seats, ready-up, player avatars, host start.
- **Arena:** Chairs in the center; animated avatars moving/dancing around them; colorful 2D or 2.5D cartoon presentation rather than heavyweight graphics.
- **Round status:** “Music playing,” “GO — FIND A SEAT!”, “Seat claimed,” “Out this round.”
- **Spectator:** Eliminated players can still watch and remain in the voice room, but cannot take a seat.
- **Final/winner:** Celebration, winner avatar, **Play again** and **Back to room**.

**Accessibility:** Show the stop cue as an on-screen signal in addition to music, allow mute, use a large touch target, and avoid relying solely on color.

## 5.4 Acceptance checks for a prototype

- A local playable demonstration can begin with 6–7 characters (human plus bots is acceptable for the isolated prototype).
- Every round has one fewer seat than active players.
- No more than one eliminated player per normal round unless a separately designed rule permits it.
- The game reliably reaches a final two-player round and declares one winner.
- Music can be turned off without hiding the visual cue.
- A player who is eliminated cannot continue claiming chairs.
- Returning to the Cycles room is a separate, clean step after the result.

**Content rights note:** Use audio/music owned by the project or otherwise properly licensed for the game; do not bundle commercial tracks without permission.

---

# 6. New game concept: Raft / Platform Pushing

**Status:** Future idea — user proposed. *Raft Rumble* is only a temporary development name.

## 6.1 Core idea — user-confirmed

Six or seven characters stand on a **raft or platform**. The aim is to **push other players off**. A player who falls off is eliminated. The last person remaining on the raft/platform wins.

The tone should be a **playful, non-graphic party game**—funny movement, wobbling, near misses, splashes—not realistic harm.

## 6.2 Suggested first prototype rules (proposals)

| Item | Proposed behavior |
|---|---|
| Players | Begin with 6–7, though 4–8 can be useful for testing. |
| Arena | One small raft/platform floating over water or a stylized fall zone. |
| Controls | On-screen joystick / thumb drag to move; one obvious **PUSH** button. |
| Push | A short-range shove in the direction the character faces; limited by a visible cooldown. |
| Physics | Clear collision boundaries, knockback, friction, and recovery; avoid impossible-to-escape chain pushes. |
| Elimination | Crossing the arena boundary and falling into the water/fall zone removes a player from active play. |
| Pressure mechanic | **Optional:** Shrink the raft after a set interval to keep rounds moving; test whether this improves play. |
| Victory | Last active character remaining wins. |
| Spectators | Eliminated players watch, chat, and remain in the social room. |

## 6.3 Suggested moment-to-moment flow

1. Players join a lobby, pick or receive an avatar, and ready up.
2. A short countdown starts.
3. Players run across the raft, dodge one another, and use Push at the right moment.
4. Characters near the edge become vulnerable; a successful shove can send them off.
5. The game clearly announces eliminations and keeps the remaining player count visible.
6. When only one player remains, play a winner animation and offer a rematch.

## 6.4 Screens and interaction ideas (proposals)

- Overhead or slightly angled cartoon view of the whole raft.
- Large touch controls placed away from the voice-room UI.
- Distinct avatar colors/shapes and display names that remain readable on phones.
- Visible Push cooldown and clear indication of being stunned/knocked back.
- Optional emotes that do not interfere with movement.
- A clean spectator camera after elimination.

## 6.5 Technical and fairness needs

- Real-time positions, hits, collisions, knockback, and eliminations must have a **consistent authoritative state**.
- Do not accept client claims such as “I pushed user X off” without validation.
- Test mobile latency, frame-rate differences, input delay, disconnections, and spectators.
- Decide whether the game pauses, ends early, or awards a result if someone disconnects during a match.

## 6.6 Acceptance checks for a prototype

- Movement and Push work using mobile-style controls.
- Characters cannot move outside the playable area without being eliminated.
- Cooldowns prevent continuous push-spamming.
- Eliminated players cannot re-enter the active raft in the same round.
- Exactly one player is declared the final winner under normal conditions.
- A test can be run locally with bots or simulated users before real multiplayer integration.

---

# 7. New game concept: Who Did It?

**Status:** Future idea — user proposed.

## 7.1 Core idea — user-confirmed

A **six-person social deduction / mystery** game. Something has happened, and players must work out **who did it**. Incorrect guesses lead to **progressively stronger in-game consequences**, potentially ending in elimination. The central fun comes from **talking, accusing, defending, bluffing, and laughing together**.

The exact hidden roles, clue system, and penalty sequence were **not finalized** in the original discussion. The following is one coherent starting design for Codex to prototype—not an assertion that these mechanics were already approved.

## 7.2 Proposed first prototype: Six-person mystery

### Roles

- **1 hidden culprit:** Privately knows they committed the round's fictional mischief.
- **1 detective:** Leads questioning and submits accusations.
- **4 other players:** Witnesses/suspects who each receive a clue or fragment of information.

A more flexible version could rotate the detective role between rounds. Roles must remain private until the round concludes.

### Example mystery

> “Someone stole the birthday cake before the party started. Who did it?”

Each player sees an individual clue. Some details are useful, some are incomplete or misleading but **not logically contradictory**. The culprit can bluff. Everyone can discuss over voice.

### Suggested round flow

1. **Lobby:** Six players join and ready up.
2. **Role assignment:** System privately assigns culprit, detective, and witnesses.
3. **Reveal:** Display the fictional incident and each player's private clue.
4. **Discussion:** Players talk; the detective asks questions.
5. **Accusation:** Detective chooses the person believed to be responsible.
6. **Judgment:** The game states whether the accusation was correct and advances the round.
7. **Result:** Either the culprit is found or the detective runs out of chances; rotate roles/rematch.

### Proposed escalating wrong-guess penalties

| Wrong accusation | Harmless in-game consequence (example) |
|---|---|
| First | A funny visual effect and a warning; game continues. |
| Second | A stronger disadvantage such as fewer remaining clue hints or a short in-game time penalty. |
| Third | Detective is eliminated from the current attempt; culprit wins that round unless another already-agreed rule applies. |

Keep consequences **cartoonish and purely in-game**—no real-world threats, distressing punishments, or involuntary voice/microphone effects. A user's microphone should not suddenly turn on or off as a penalty.

### Design choices still open

- Whether the detective accuses alone or the group votes.
- Whether suspects can give false statements freely or must follow a clue constraint.
- Whether incorrect accusations expose clues to everyone.
- Whether the game needs exactly six players or supports a smaller testing mode.
- How to prevent a player who already knows the answer from spoiling repeated rounds.
- Whether an eliminated player becomes a spectator or receives a new role next round.

## 7.3 Why this fits Cycles

Unlike a reflex game, *Who Did It?* makes **conversation itself the core gameplay**. It creates opportunities for jokes, disagreements, persuasion, and cooperation inside a small voice room. A text-input fallback would improve accessibility for people who prefer not to speak.

## 7.4 Acceptance checks for a prototype

- Six participants can enter a mystery and receive private roles/clues.
- Only authorized players see their private information.
- One person or voting mechanism can submit a valid accusation, according to the selected rule.
- Wrong guesses consistently advance the penalty stage; the stage cannot reset by refreshing.
- A correct guess and the final failed attempt both produce unambiguous results.
- No game-generated penalty changes microphone permissions.
- The system allows a new round with reshuffled roles or a clean exit to the room.

---

# 8. Game label observed in testing: Find the Impostor

**Status:** Named in the existing Cycles host-room text; **not established here as completed gameplay**.

### What is actually known

In a recent browser test, **Host a room** included wording such as **“Play Ludo or Find the Impostor…”** while six game entries were visible. That test **did not play a multiplayer match**, and it did not document *Find the Impostor*'s rules.

### Possible genre direction — **not confirmed**

A hidden-role social game in which one participant is secretly the impostor and the others use conversation/clues to identify them. That is only a genre-based interpretation of the title; it **must not** be used to replace existing game behavior without code review or the founder's approval.

### Instructions for Codex

1. Find the existing game catalogue and all references to **Find the Impostor**.
2. Determine whether it has an implementation, placeholder page, room type, or just a promotional label.
3. Report its actual rules/player count/status.
4. Compare it with *Who Did It?* and identify any duplication.
5. **Do not merge or delete either game automatically.**

---

# 9. New card game option: Card Clash Seven (6–7 players)

**Status:** **New option — suggested for evaluation**, **not** part of the existing card game's confirmed rules. Working title only. This directly addresses the request for a card game in which **six or seven people can play together**.

## 9.1 Experience

Seven people sit around a digital card table inside a Cycles voice room. Each sees their own cards privately. The table shows the current suit, discard pile, whose turn it is, and how many cards other players have. The goal is to be the first person to get rid of every card while choosing smart plays and challenging rivals.

**Don't replace the existing "What's" / possibly WHOT card game.** First inspect whether its current implementation already supports 6–7 players. If it does, an optional expanded-player mode may be more valuable than building a redundant new card game.

## 9.2 Proposed implementable rules (MVP)

| Rule | Proposed behavior |
|---|---|
| Players | Supports 2–7; **6–7** is the priority multiplayer test. |
| Deck | **Two standard 52-card decks, no jokers** (104 physical/digital card instances, each with a unique ID). Multiple copies of the same rank/suit can exist. |
| Deal | Shuffle securely on the authoritative server; give **7 cards per player**. Put one non-special card face-up on the discard pile; the remainder forms a face-down draw deck. |
| Turn | A player may place **one card matching the suit or rank** of the top discard card. If no matching card is available, draw one card and either play it if legal or end the turn. |
| Simple first release | Start with **no power cards**. Prove the seven-player turn loop, privacy, legal moves, drawing, and victory before introducing action effects. |
| Turn clock | Suggest **20 seconds**; a timeout auto-draws one card if possible and passes to the next active player. |
| Declare last card | When a player reaches exactly one card, show a conspicuous **"One card left"** indicator automatically; no hidden gesture or penalty in the MVP. |
| Victory | First player whose hand reaches **zero** after a legally resolved move wins the round. Show a results screen and rematch. |
| Draw-pile exhaustion | Keep the most recent discard visible, shuffle the other discard cards back into a new draw pile; never copy/recreate cards. If no draw cards remain and nobody can play, finish as a stalemate and award **fewest cards** (ties shared). |
| Disconnect | Preserve a seat for a short reconnection window; if it expires, mark the player as forfeited and skip their turns. The player cannot see another person's hand while reconnecting. |

**Optional later variant, not MVP:** Introduce a small number of original action cards (reverse order, skip, exchange hand, choose suit), each with a clearly written priority order and tests; avoid cloning a branded commercial game's complete rules/visual identity.

## 9.3 Essential Cycles screens

- **Card lobby:** seven named seats, ready status, host controls, and public/private audience choice if already available in Cycles.
- **My cards:** scrollable/fanned private hand optimized for a 390 × 844 phone. Show which cards are playable, but let server validate every submission.
- **Shared table:** discard card, current suit/rank, draw deck, remaining hand counts, player avatar, turn timer.
- **Round result:** first finisher, optional card-count ranking, rematch, return to Cycles room.

## 9.4 Acceptance checks

- Exactly seven players can join, receive seven private cards each, and complete a round without leaking hands.
- Only the player whose turn it is can act; duplicate taps, replayed messages, and illegal cards are rejected server-side.
- Dealing never creates/destroys duplicate card instances; reshuffling preserves deck integrity.
- Six-person and seven-person matches work on narrow mobile screens.
- An inactive or disconnected participant cannot freeze the table permanently.
- Finishing the game does not disconnect anyone from Cycles voice chat.

---

# 10. New card game option: Bluff Table (6–7 players)

**Status:** New option — suggested for evaluation. A more conversation-heavy card game than Card Clash Seven. Propose building **one** of these two new card concepts first, not both at once.

## 10.1 Concept

Players lay cards face down while **claiming** that the cards match the round's target rank. They might be telling the truth or bluffing. The next player can challenge the claim. Correctly catching a bluff forces the bluffer to collect the center pile; accusing an honest player forces the challenger to collect it. The first player who can safely empty their hand wins.

## 10.2 Proposed MVP rules

- **Participants:** six or seven. Use **two shuffled standard 52-card decks**; deal **five cards each** to begin. Unused cards remain outside the match for this variant.
- **Target rank:** begins at Ace; after a **resolved challenge**, moves to the next rank (2, 3 ... King, then Ace). A visible table label shows the current target.
- **Turn:** place **one to three** cards face down and claim all have the target rank; the cards need not actually match. Only the server knows their true identities until revealed.
- **Challenge window:** after each play, the **next player** gets up to **8 seconds** to tap **Challenge**; otherwise the next player's normal turn begins. No other player can challenge that play in this MVP.
- **Challenge outcome:** reveal only the most recent submitted cards. If any mismatch the rank, **bluffer takes the whole center pile**; otherwise **challenger takes the whole pile**. Clear the center pile, advance target rank, and resume with the player after the person who took the pile.
- **Winning:** a player with no cards must survive the 8-second challenge window. If their final play is successfully challenged, they collect the pile and remain in the match. If not challenged, or if challenged incorrectly, they win.
- **Time limit:** suggest 8 minutes per match. If reached, **fewest cards wins**, with ties broken by a shared finish. A timeout on a normal turn auto-plays one card if available, chosen by the server, rather than freezing the table.
- **Social interaction:** players can talk and bluff **voluntarily**; no microphone use is required to play.

**Codex note:** These rules are a proposed prototype design inspired by a broad traditional bluffing-card genre. Create original artwork/naming, and test every state transition, especially an empty-handed player challenged during the final window.

---

# 11. Competitive game option: Quickfire Quiz Arena

**Status:** New option — suggested for evaluation. **Players:** ideally 6–7.

**Concept:** Everyone sees the same question and four choices. Players privately select an answer before the countdown ends. Correct answers earn points; faster correct answers earn a small bonus. After a fixed set of rounds, the highest score wins.

**Proposed rules:** 10 questions per match; 12 seconds per question; +100 points for a correct answer and up to +20 speed bonus measured by authoritative timestamps, with a cap to reduce network advantages; incorrect or missing answer scores 0. If tied at the end, show joint winners in MVP rather than an unfair sudden-death latency contest. Avoid real-money rewards.

**Challenges:** Geography, African film/music history with properly sourced question rights, general knowledge, sports facts, and user-selectable learning topics. Questions must have verified answers and categories; no AI-generated fact should be silently treated as correct.

**Acceptance:** Seven simultaneous private answers; no hints leaked by early answer reveals; same server countdown; accurate score totals; readable at mobile size; question bank has no duplicates in one match.

---

# 12. Competitive game option: Hot Potato

**Status:** New option — suggested for evaluation. **Players:** ideally 6–7.

**Concept:** One player's avatar holds a silly glowing "hot potato." They must pass it to another remaining player before a hidden timer expires. The person holding it when the timer ends is out. Repeat until one survives.

**Proposed rules:** Each round randomly selects a holder; holder may tap a **different active player** to pass, with a visible 1-second cooldown to prevent immediate pass-back ping-pong. The timer expires unpredictably within a disclosed range, for example 10–20 seconds, and must be controlled by the server. At expiry, eliminate the current authoritative holder, not whichever client's animation ran last. Continue until one winner. A disconnected holder should have a documented timeout/fairness rule; don't trap the entire room.

**Why it suits Cycles:** Short, funny moments and group reactions, with optional speech rather than required voice. Use animations and onscreen cues without loud forced audio.

**Acceptance:** No self-pass, no pass to eliminated players, no double-pass or conflicting owners, reliable result on slow phones, spectator/rematch flow.

---

# 13. Competitive game option: Word Chain Knockout

**Status:** New option — suggested for evaluation. **Players:** ideally 6–7.

**Concept:** A player enters a word starting with the last letter of the previous valid word. The group races against a decreasing timer, making the challenge harder as the match continues.

**Proposed rules:** A curated dictionary and a declared language; 10 seconds to answer in round one, dropping by 1 second at later milestones to a safe minimum of 5 seconds; no repeated answers within the same match; no proper nouns in MVP. A correct answer advances the turn. Timeout or invalid submission loses one of two lives; zero lives means spectator. The last person with a life wins. Choose the starter word from the curated dictionary to avoid dead-end letters; provide a fair reshuffle if the dictionary has no accepted continuation.

**Accessibility and fairness:** Typed entries are the default, with voice answers optional only after robust transcription and dispute handling. Display the prior word and required first letter clearly. Do not unfairly reject legitimate regional spellings—support a configurable localized dictionary and communicate the accepted word set.

**Acceptance:** Seven-player turn cycle, repeat-word rejection, server-side dictionary validation, transparent reasons for invalid entries, no accidental loss of lives on duplicate network submissions.

---

# 14. Competitive game option: Memory Grid

**Status:** New option — suggested for evaluation. **Players:** ideally 6–7.

**Concept:** All players see an arrangement of icons for a few seconds. The arrangement disappears, then players answer questions such as "Which icon was in the top-right cell?" or "Where was the bicycle?" Higher rounds include more cells.

**Proposed rules:** Start with a **3×3** grid shown for 8 seconds. Everyone then answers the same 5-second question privately. Score +1 for a correct answer, 0 otherwise. Increase to **4×4** after several questions, not abruptly. Ten questions total; highest score wins, ties shared. Use accessible icons with distinct shapes and optionally readable labels; don't rely on color alone.

**Acceptance:** The same authoritative grid and question for all participants, no early spoilers, scoring after deadline, scalable layout on small phones, testable deterministic seed in local test runs.

---

# 15. Competitive game option: Draw & Guess

**Status:** New option — suggested for evaluation. **Players:** ideally 6–7.

**Concept:** One player gets a secret word and draws it on a shared canvas while everyone else guesses. A correct guess earns points for the guesser and drawer. Roles rotate so each participant gets a chance to draw.

**Proposed rules:** 60-second drawing rounds; each player draws once; guessers type guesses privately to prevent copycat answers; first correct guess gets +3 points, later correct guesses +1, and drawer earns +1 if at least one guesser succeeds. Ban letters or numerals in the drawing for the initial category if that helps keep it playful. Include Undo, Erase, and Clear; provide text alternative or skip-drawing accommodations.

**Safety:** Drawings and entered guesses are user-generated content. Reuse existing report/block/moderation tools; don't assume a canvas is safe because a match is private. Consider ephemeral retention.

**Acceptance:** Seven-player shared drawing updates, consistent canvas state, no leaking the secret word to guessers, no repeated scoring for the same user, clean transition between drawers.

---

# 16. Competitive game option: Team Puzzle Race

**Status:** New option — suggested for evaluation. **Players:** 6–7.

**Concept:** Two or three teams solve a short set of visual puzzles, word clues, and logic challenges. Team members may discuss options in voice or text. Team score measures correct solutions rather than how loudly someone speaks.

**Proposed MVP:** With six players, create two equal teams of three. With seven, either (a) offer a **3 vs. 4** arrangement with normalized per-player contributions or (b) put one person in a rotating host/spectator slot so all active teams are equal; **do not automatically impose a permanent disadvantage**. Three puzzles per match, 90 seconds per puzzle, first correct team gets bonus points; team members can each submit a private proposal, with a nominated captain confirming the team's final answer. Highest points wins.

**Acceptance:** Team boundaries and captains are clear; scores cannot be inflated by repeated submissions; reconnecting players retain team assignment; nobody is forced to speak; a seven-player fairness design is explicitly chosen before production.

---

# 17. Common Cycles game requirements

These are **integration recommendations**, not proof they already exist in the app.

## 17.1 Social-room behavior

- Games should live **inside Cycles' Play/Rooms flow** and coexist with voice-room participation.
- A room has a clear host, player count, join state, game state, and **Leave** action.
- Keep the normal room capacity around **6–7** unless the game itself requires fewer seats (e.g., Ludo) or an explicitly approved exception.
- Prefer **invite-only and public** rooms where the app already supports those options.
- People should be able to **listen without activating their microphone**.
- Game sound/music and voice-chat audio should be independently adjustable when feasible.
- Never automatically enable a microphone when gameplay begins.
- Eliminated players may stay as **spectators** without occupying a playable seat in that round.
- A match finishing should not abruptly eject everyone from the Cycles room.

## 17.2 Must-have game states

`LOBBY → READY / COUNTDOWN → PLAYING → ROUND_RESULT → MATCH_RESULT → REMATCH or EXIT`

Also handle `WAITING_FOR_PLAYERS`, `PAUSED / DISCONNECTED`, and `CANCELLED` where relevant. Clear states prevent a frozen or empty screen from looking like a broken game.

## 17.3 Safety and usability

- Large controls and readable labels at phone sizes (a prior app test used **390 × 844**).
- Clear **mute**, **leave**, **report**, and **block** paths, integrated with existing Cycles tools.
- No screen-reader-only invisible state changes; show selected/ready/muted states accessibly.
- Disconnect/rejoin, duplicate actions, double taps, stale rooms, and simultaneous match endings must be tested.
- Avoid paid wagers, cash prizes, or real-world punishment mechanics.
- Do not publish a room or contact real users during isolated test runs without approval.

## 17.4 Practical implementation approach

1. **Audit existing app first.** Identify its framework, routing, Play catalogue, rooms, current real-time system, Ludo/card-game architecture, and multiplayer/session/auth patterns.
2. **Build new games as isolated modules/prototypes** with reusable UI/components and clean match logic.
3. **Test locally with simulated users/bots** before introducing real multiplayer or touching production data.
4. Add authoritative server-side (or equivalent trusted) state validation for multiplayer. Do not trust a client to declare itself the winner.
5. Reuse Cycles' existing avatars, nicknames, identity, voice rooms, moderation, and design system where suitable.
6. Integrate **one game at a time** behind a development/feature flag, run real-device testing, and only then broaden rollout.
7. Track simple outcomes: room creation, successful match start, match completion, repeat play, invite/join rate, and crashes/disconnects. Avoid assuming a game is successful just because a prototype works.

---

# 18. Suggested build order for the next phase

**This is a proposal, not a final commitment.** The founder previously asked to try building the **first** new game, which was **Musical Chairs**, before integrating it into Cycles.

| Stage | Work | Deliverable |
|---|---|---|
| **0 — Inventory** | Inspect the current Cycles repository; verify Ludo, the card game, Find the Impostor, and all six catalogue entries. | Short report: what exists vs. placeholders; no accidental overwrites. |
| **1 — Musical Chairs prototype** | Implement its circle/chair/stop/eliminate/final-winner loop with bots or simulated players. | Playable standalone mobile-friendly prototype, not production-connected. |
| **2 — Musical Chairs multiplayer test** | Prove real-time sync and fairness in an isolated environment. | Controlled room test with multiple devices/users. |
| **3 — First card/challenge prototype** | Check whether the existing card game can handle 6–7; if not, evaluate **Card Clash Seven**. Alternatively choose **Quickfire Quiz** or **Hot Potato** based on user testing. | One short playable isolated 6–7-person competitive prototype. |
| **4 — Who Did It? or Raft prototype** | Choose based on feedback and technical effort. | One additional playable isolated prototype. |
| **5 — Cycles integration** | Attach tested games to Play/Rooms, preserve voice behavior and safety, add match/room states. | Feature-flagged integration and regression testing. |
| **6 — Market validation** | Test with small groups of real users before expanding the catalogue. | Evidence about which games bring people back to Cycles. |

**Why prototype first?** Cycles is already built and the current challenge is market testing. A separate game prototype makes it possible to validate fun and controls without destabilizing signup, login, voice rooms, or existing games.

---

# 19. Copy-and-paste handoff for Codex

> You are helping with an existing application called **Cycles**, a small live social-room platform. The app already exists. It is **not LocalLoop**. Read the entire file `Cycles_Games_Design_Brief_For_Codex.md` before writing code.
>
> **First, audit the existing project** and identify its tech stack, game catalogue, room architecture, and existing Ludo / playing-card / Find the Impostor code. Clearly distinguish implemented features from placeholders. Do not overwrite or redesign existing games.
>
> **Then start with a standalone, mobile-friendly Musical Chairs prototype** implementing the rules in section 5: 6–7 characters (allow bots for testing), one fewer chair, music/dancing, unpredictable stop signal, seat claiming, one elimination per round, repeated rounds, final two fighting for one chair, one winner, and replay. Use visual cues as well as sound, accessible large controls, and a playful cartoon presentation. Make the round engine testable independently of rendering.
>
> **Additional ideas:** Sections 9–16 describe new multiplayer card and competitive games for 6–7 people. They are options, **not instructions to build all of them**. Audit the existing card game first; the founder may choose a 6–7-player upgrade instead of a duplicate.
>
> **Do not deploy or connect to production users.** Do not modify live Cycles rooms or user accounts yet. Before any real multiplayer integration, explain how fairness, synchronization, cheating, reconnection, spectators, and microphone permissions will be handled. Reuse the app's existing conventions rather than imposing a new framework.
>
> Share a concise list of files changed, how to run/test the prototype, and what remains to integrate it into Cycles. **Do not implement every proposed game at once.**

---

## 20. Scope boundary and unresolved decisions

This document covers **games only**. Proposed future Watch Together, sports viewing, creator video uploads, and broadcasting rights belong to Cycles' separate product roadmap, **not** these game specifications.

**Open items for a later product decision:** exact existing card-game title and rules; whether to expand it to 6–7 or build Card Clash Seven; which new challenge games market testers prefer; whether *Find the Impostor* is functional or a placeholder; whether it overlaps with *Who Did It?*; finalized character art/style; final game player caps; exact penalties/mystery design; music assets and licensing; and which new game proceeds after Musical Chairs.

**Key rule:** Treat **user-confirmed concepts** as the design intent and **proposed mechanics** as starting points to prototype—not as finished requirements or features that already exist.
