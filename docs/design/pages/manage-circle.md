# Manage group (host)

**Kind:** screen + sheets · **Release:** V1 · **Entry:** Circle detail overflow › Manage circle (host only)

## Layout
Sections as grouped lists:

**Details**
- Edit name, purpose, description (same form as Start something, prefilled). Changing purpose to a support mood requires trained-host status.

**Schedule**
- Days and time (day picker + time picker). Changing either notifies all regulars.
- **Skip a date:** list of next 6 dates, each with a Skip toggle. Optional short note to regulars ("Public holiday").

**Who can join**
- Public / Invite only (radio).
- **Invite people** → invite sheet (share link that expires in 7 days, or pick saved people).
- **Join requests** (invite-only circles): rows with Accept (secondary) / Decline (tertiary). Declines are silent.

**Regulars**
- List with avatar, name, "Since Aug". Overflow on each: Remove from group (confirm, silent to them except a notification "You're no longer a regular of Night Owls"), Report, Block.

**Hand over or end**
- **Pass the group to a regular** → picker → they must accept.
- **End this group** (`danger` text) → confirm sheet: "Night Owls will stop meeting. Regulars will be told." Buttons **End group** (danger) / Cancel.

## Rules
- Size options follow CIRCLES_DESIGN_DIRECTION.md › Rules by kind of room (free talk 6, hosted talk 10, free learning 7, paid class 10 to 12, play 6). The host of a group is its room host.
- A host can run at most 3 groups in V1 (keeps quality up; adjustable in the console).
- All changes save immediately with a toast ("Saved") except schedule changes, which need a **Save and tell regulars** confirm.

## Data
Uses Circle (see circle-detail.md) plus joinRequests[ {userId, at, status} ].
