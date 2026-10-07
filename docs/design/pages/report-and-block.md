# Report and block

**Kind:** 3 report sheets + block confirm sheet · **Release:** V1 (required by the app stores for apps with user content)

## Entry points
- In a room: **Report** button in the top bar → starts at "Who".
- Mini profile or host actions: **Report [name]** → skips "Who".
- After the room: "Report someone" → "Who", listing everyone from that room.
- Saved people / Blocked people lists: overflow menu → Report.

Reporting works for up to **48 hours** after a room ends.

## Sheet 1: Who
- Title "Who do you want to report?"
- List of people in the room (avatar, name, role). Single choice.
- Last row: "The whole room" (for a room title or theme that breaks the rules).
- Button: **Next** (primary, disabled until a choice is made).

## Sheet 2: What happened
- Title "What happened with Ada_K?"
- Reasons (single choice, radio rows with a one-line explainer):
  1. **Someone may be in danger** — "They talked about hurting themselves or someone else."
  2. **Sexual or creepy** — "Sexual talk, asking for photos, or making someone uncomfortable."
  3. **Hate or harassment** — "Insults, slurs or targeting someone."
  4. **Threats or violence**
  5. **Seems under 18**
  6. **Scam, spam or selling**
  7. **Sharing private information** — "Someone's real name, number or location."
  8. **Something else**
- Optional text box: label "Tell us more (optional)", helper "Voice isn't recorded, so details help us act. Only the Circles team sees this." Max 500 characters, counter shown from 400.
- Button: **Send report** (primary).

### If "Someone may be in danger" is chosen
Before sending, show a banner at the top: "If someone is in danger right now, contact emergency services." with **See help options** (opens Need more help). The report is marked **urgent** in the console.

## Sheet 3: Report sent
- Check icon in `liveSoft`.
- Title "Thanks for telling us."
- Body: "The Circles team will look at this. Ada_K won't know who reported them."
- Switch row (off by default): **Also block Ada_K** — "You won't be put in a room together again."
- Button: **Done** (primary).
- Link: "What happens next?" → help article.

## Block confirm sheet
Reached from mini profile, host actions, report sent (switch), saved people.
- Title "Block Ada_K?"
- What it does, as three short check rows:
  - You won't be matched into the same room.
  - You won't see each other's rooms in Live or Search.
  - Any save between you is removed. They aren't told.
- Buttons: **Block** (danger) and Cancel. Scrim tap does not dismiss.
- If both of you are in a room right now: after blocking, the blocker is offered **Move me to another room** (primary) or **Stay for now**.
- Toast after: "Ada_K is blocked. Undo in Me › Settings › Blocked people."

## States
- Sending: button shows spinner; sheet can't be dismissed.
- Failed: inline error "We couldn't send that. Check your connection and try again." Keep the chosen reason and text.
- Duplicate: if the same person was reported by this user in the last 24 h, still accept and merge; say "We've added this to your earlier report."

## Rules
- Reports are never shown to the reported person, including the reporter's name.
- Reporter can't see the outcome of individual reports in V1; they get a general notification when action is taken ("We acted on a report you sent. Thank you.").
- Blocking is instant and silent.

## Data
Report: id, reporterId, reportedUserId | roomId, roomId, reason, details, urgent, createdAt, status (open | reviewing | actioned | dismissed), moderatorId, outcome.
Block: blockerId, blockedId, createdAt.
