# Room preview

**Kind:** sheet · **Release:** V1 · **Entry:** tapping a room row anywhere (Home, Live, Search, a connection's notification)

## Purpose
Let someone see what they're walking into before their voice is in the room. Join from a row's **Join** button skips this sheet.

## Layout
1. Grab handle.
2. Mood/topic chip + "Trained host" chip when relevant.
3. Title (`title`).
4. Host line: avatar 32 + "Hosted by Tolu" (or "No host · everyone can talk").
5. **Who's here:** up to 6 small avatars in a row + "+2" and "6 of 10 seats". Names are shown (nicknames only). Connections are listed first with a small live-green dot.
6. **Speaking now:** "Tolu and Ada_K are talking" (live).
7. Rules line (shield icon): "Room rules · agreed 28 Sep · View".
8. Switch row: **Join with mic off** (on by default, remembers the user's last choice from Talk now).
9. Primary: **Join room**. Helper under it: "You'll appear as NightRunner".

## States
- Full: primary becomes disabled "Room full"; secondary **Find me a similar room** (uses matching with this room's mood/topic).
- Just ended or locked while open: replace content with "This room just closed." + **Find me a similar room**.
- Contains someone you blocked: room is hidden everywhere, so the sheet can't open; if it's already open, it closes with a toast "That room is no longer available."
- Joining: button spinner. If joining fails: inline error with Try again.

## Data
Room: title, mood/topic, host, trained flag, seat count/limit, participants (nickname, avatar, isConnection), current speakers.
