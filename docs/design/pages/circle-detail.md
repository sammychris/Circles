# Group detail (was Circle detail)

**Kind:** screen · **Release:** V1 · **Entry:** any circle card or row, notifications, invite links

## Purpose
Everything someone needs to decide whether to become a regular.

## Layout (top to bottom)
1. Top bar: Back · Share (icon button, label "Invite to this circle") · overflow (Report circle; for the host: Manage circle).
2. Purpose chip (mood or topic) + "Invite only" chip with lock when private.
3. Name (`title`).
4. Schedule line, big and clear: **"Every Friday · 10:00 pm"** and under it "Next: Fri 9 Oct, in 6 days". Shown in the viewer's own time zone; if different from the host's, add "(9:00 pm for Emeka in London)".
5. Host row: avatar 44 · "Hosted by Emeka" · "Trained host" chip if relevant.
6. Description (up to 280 chars) with "Read more" after 4 lines.
7. **Regulars:** "7 regulars" + up to 6 avatars. Visible only to regulars and people the host invited; for the public it shows the count only. (Protects regulars from being tracked; see review item 12.)
8. **Next dates:** the next 3 meetings as rows; skipped dates shown struck through with "Skipped".
9. Rules line.

**Bottom action area** (fixed):
- Not a regular: primary **Join this circle** → becomes a regular and turns reminders on. Helper "You'll get a reminder 15 minutes before."
- Regular, meeting not soon: secondary **Reminder on** (selected state, toggles) + tertiary **Leave circle**.
- Meeting starts within 5 minutes or is live: primary **Go to circle** (opens Starting soon or the room).
- Invite-only and not invited: primary disabled "Invite only" + tertiary **Ask the host** (sends a request the host approves in Manage circle).

## States
- Loading: skeleton.
- Circle ended by host: banner "This circle has ended" and only the description remains.
- Full (circle size reached for regulars): "Full · 10 of 10 regulars" + **Remind me if a spot opens**.

## Data
Circle: id, name, purpose, description, hostId, schedule {days[], time, timeZone}, size, visibility, regulars[], skippedDates[], status.
