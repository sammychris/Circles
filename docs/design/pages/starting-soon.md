# Starting soon (circle lobby)

**Kind:** screen · **Release:** V1 · **Entry:** "Circle starting" notification, Go to circle on Circle detail, Home's next-circle card

## Purpose
Get regulars into the room together, so nobody sits alone in an empty room for 10 minutes. Opens **5 minutes before** the start time.

## Layout
1. Top bar: Back (minimises to Home with the lobby kept in the room bar).
2. Purpose chip + circle name (`title`).
3. Countdown: large tabular "4:12" with "until Night Owls starts" (soft ring like Room drops to 2; no ticking sound).
4. **Who's here:** avatars of people waiting, in arrival order, with "Tolu (host)" first. "3 here · usually 7".
5. Quiet text chat: "Say hi while you wait" input + last 3 messages.
6. Switch: **Join with mic off** (on by default).
7. Bottom: status text "The room opens when the host arrives" or, when the host is in: primary **Join now** enabled 1 minute early.

## Behaviour
- At start time, if the host is here and at least 3 people are waiting, everyone is moved into the room together (slow transition).
- Host not here at start: wait up to 10 minutes with "Waiting for Emeka". After that: hosted circles of **non-support** moods open unhosted if 3+ people (limit 6). **Support moods never open without a trained host**: show "Emeka can't make it tonight. We'll move you to a hosted I'm down room." and use matching.
- Fewer than 3 people 10 minutes after start: "Not enough people tonight" + **Find me a room** (primary) + **See you next week** (tertiary).

## Data
Circle meeting: circleId, date, status (lobby | live | skipped | cancelled | not-enough), waiting[], hostPresent.
