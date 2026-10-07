# In a room: host view (plus Raised hands, Host actions, Host leaving, Minimised bar)

**Kind:** screen + 3 sheets + 1 state · **Release:** V1 · **Builds on:** the member room (`docs/screens/05-in-a-room.png`)

## Purpose
The host keeps a hosted room (up to 10 people) kind and moving: letting people speak, quieting or removing someone, and handing over when they leave. Unhosted rooms (3 to 6) have no host view; everyone has the member controls.

## Who is host
- Whoever created the room or the circle, or someone the previous host passed it to.
- Support moods (I'm down) can only be hosted by people with "Trained host" status for that mood.
- There is exactly one host per room at a time.

## Layout: host view (differences from the member room)
Top to bottom:
1. **Top bar:** Minimise (left), then on the right a **Room menu** icon button (`more-horizontal`, label "Room options") and Report.
2. **Title block:** same as member view, plus a chip **"You're the host"** (`emberSoft` / `ember`).
3. **Help banner** in support rooms (same as member view).
4. **Room grid:** same as member view. Tapping a person opens **Host actions** instead of the mini profile.
5. **Hands strip** (only when at least one hand is up): a full-width `surface` row directly above the controls. "2 hands up" + up to 3 small avatars + **"See hands"** (secondary). Tapping opens **Raised hands**.
6. **Controls:** the four-button row, with Raise hand replaced by **Hands** (count badge): Hands, Chat, Table, Leave. Then the mic control. During an activity, Table becomes **End game** / **End activity** for the host.

### Room options sheet
- **Lock room** / **Unlock room** (switch row). Locked: nobody new can join from lists or Talk now; invites still work. Helper: "People already here stay."
- **Room rules** (opens the rules, read-only).
- **Pass host to…** (opens a person picker).
- **End room for everyone** (tertiary, `danger` text) → confirm sheet.

## Raised hands sheet
- Heading "Hands up" + count.
- List in the order hands went up (oldest first). Each row: avatar, name, "Waiting 2 min", **Let in** (secondary) and **Not now** (tertiary).
- **Let in:** the person becomes a speaker; they hear a soft tone and see a toast "You can talk now", but **stay muted until they unmute themselves**. Never unmute anyone automatically.
- **Not now:** lowers their hand; they see "The host lowered your hand. You can raise it again later." No reason is shown.
- Limit: 7 speakers at once (host included). When full, Let in is disabled with the reason "7 people are speaking. Move someone back to listening first."
- Empty: "No hands up."

## Host actions sheet (tap a person)
Header: avatar, name, their status. Actions, in this order:
1. **Make speaker** / **Move to listening** (depending on their role).
2. **Mute** — mutes them now. They can unmute themselves unless the host also chose "Keep muted" (a switch in a follow-up confirm). They see "The host muted you."
3. **Save** (same secret save as everyone else).
4. **Remove from room** (tertiary, `danger` text) → confirm sheet:
   - Title "Remove NightRunner?"
   - Reason picker (required): Unkind or insulting · Sexual or creepy · Spam or selling · Off-topic after a warning · Other
   - Switch: "Also report to the Circles team" (off by default; on automatically for "Sexual or creepy").
   - Buttons: **Remove** (danger) and Cancel. Scrim tap does not dismiss.
   - Removed person: cannot rejoin this room until it ends; sees `docs/design/pages/removed-warned-suspended.md` › You were removed.
5. **Report** and **Block** (same as members).

Hosts cannot remove or mute other trained hosts' moderation (n/a in V1: one host only).

## Host leaving sheet
Shown when the host taps Leave.
- Title "You're the host. Before you go:"
- **Pass host to someone** (primary) → picker of current speakers first, then listeners. Picked person must accept ("Tolu wants you to host. Accept?") within 30 seconds; otherwise the next suggestion is asked.
- **Leave without a host** (secondary): allowed only when 6 or fewer people remain; the room becomes unhosted (size limit 6). If more than 6, this option is disabled with "More than 6 people: pass host or end the room."
- **End room for everyone** (tertiary, `danger`): confirm, then everyone goes to After the room.
- Support moods: "Leave without a host" is never offered; if no trained host accepts, the room ends gently with a message to everyone: "The host had to go. We'll move you to another room." and everyone is moved via matching.

## Host disconnects
If the host's connection drops: 30-second hold (see Reconnecting). After that, the longest-present speaker becomes host automatically **except** in support moods, where the room is matched into another trained-host room.

## Minimised bar (all users)
- Sits at the bottom of every page while you are in a room. 64 px, `surface`, top divider.
- Left: mood icon + room title (one line, ellipsis) + "6 people · Tolu speaking".
- Right: **mic toggle** (icon button showing the current mic state, label "You're muted" / "You're live") and an **expand** chevron. Tapping anywhere else expands the room.
- Leaving is only possible from the expanded room (prevents accidental leaves).

## States
- Loading people: grid skeleton of 6 circles.
- Reconnecting: banner over the grid "Reconnecting… your seat is held for 30 seconds." Controls disabled. After 30 s: "We couldn't reconnect" + **Rejoin** (if room still open and not full) / **Back to Home**.
- Room ended by host: everyone goes to After the room with "The host ended the room."

## Accessibility
- Hands strip announces "2 hands up. See hands, button."
- Host action results are announced ("Bayo muted").

## Data
Room: hostId, locked, speakerLimit (7), participants[ {userId, role: host|speaker|listener, micState, handRaisedAt, keptMuted} ], removals[ {userId, byHostId, reason, at} ].

## Open questions for Sammy
- Can hosts see the "What's on your mind?" line people typed in Talk now? Recommendation: **no** (the Talk now screen promises it's never shown).
- Speaker limit 7 in a 10-person room: confirm.
