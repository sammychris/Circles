# Moderation console (web, for the Circles team)

**Kind:** web app, 5 screens · **Release:** V1 · **Users:** Sammy and trusted moderators only (separate login with two-step verification)

Not part of the phone app. Same Lamplight tokens in the Day theme (long working sessions), desktop layout with a left menu: Reports · Hosts · Live rooms · People · Settings. Must work on a phone browser for emergencies (menu stacks on top).

## 1. Reports queue
- Table: Priority · Reason · Reported person · Reporter count · Room · Age · Status.
- Default sort: **urgent first** ("Someone may be in danger", "Seems under 18", "Sexual or creepy"), then by number of separate reporters, then oldest.
- Filters: status (Open, Reviewing, Done), reason, date.
- A report older than **2 hours** while urgent turns `danger`. Show a count of open urgent reports in the menu.
- Claim: opening a report marks it "Reviewing by [moderator]" so two people don't work the same one.

## 2. Report detail
Left column (evidence):
- The report: reason, details, time, room.
- **Room log:** who was in the room, join/leave times, role changes, host actions (mutes, removals with reasons).
- **Chat transcript** for that room (kept for the stated retention period only).
- Other reports about this person (count + reasons, last 90 days), past warnings and suspensions.

Right column (actions):
- **Dismiss** (no action) · **Warn** (pick rule) · **Suspend** (24 hours / 7 days / 30 days, pick rule) · **Ban** (permanent, phone number blocked) · **Remove host status**.
- Every action needs a rule and an internal note. Every action is logged with moderator and time and can be reversed by Sammy.
- "Someone may be in danger": a checklist panel with the crisis steps from the host guide and the crisis line for the country.

## 3. Host applications
- List: applicant nickname, account age, rooms joined, reports against them, moods requested, short answers.
- Actions: Approve for moods (checkboxes) · Ask for more info · Decline (with reason sent).
- Support moods need training complete before approval.

## 4. Live rooms overview
- Grid of open rooms: title, mood/topic, host, people count, open reports in the last 30 minutes.
- Open a room to see participants and **End room** or **Remove person** remotely. Moderators cannot listen in silently in V1 (privacy promise); decide this deliberately before adding it.

## 5. Settings
- Moods and topics (names, icons, on/off).
- Room sizes and limits, timers (reconnect hold, drop-to-2 wait, lobby opening).
- Crisis and emergency lines per country (required before launch).
- Rules text and help articles.
- Moderator accounts and roles (Admin, Moderator).

## Data
Uses Report, Block, Warning, Suspension, Removal, Room log, Chat, Host application, plus ModeratorAction {moderatorId, targetId, type, rule, note, at, reversedBy?}.
