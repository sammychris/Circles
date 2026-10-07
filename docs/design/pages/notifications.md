# Notifications

**Kind:** screen · **Release:** V1 · **Entry:** bell icon on Home (with an `ember` dot when there's something unread), or a push notification

## Purpose
Push notifications get missed or swiped away. This page keeps them, and every item opens exactly the thing it is about.

## Layout
1. Back + title **Notifications**.
2. Sections: **New** (unread) and **Earlier** (last 30 days). Older items are deleted.
3. Rows: icon in a tinted 40 px square · one or two lines of text · time ("9:41 pm", "Yesterday") · unread dot.
4. Top-right tertiary: **Settings** → Notification settings.

## Notification types (V1)

| Type | Text | Opens | Icon / tint |
|---|---|---|---|
| Circle starting | "Night Owls starts in 15 minutes" | Starting soon | clock / textSoft |
| Circle changed | "Night Owls is skipped this Friday" | Circle detail | calendar / textSoft |
| Connection joined a room | "Tolu just joined a room" | Room preview | users / live |
| Invite to private room | "Ada_K invited you to a private room" | Invite landing | lock / textSoft |
| Invite to circle | "Emeka invited you to Laugh it off" | Circle detail | circles / textSoft |
| Thank-you received | "Someone from Rough day? Let's talk sent you a thank-you" | Thank-yous received | heart / emberText |
| New mutual connection | "You and Bayo saved each other" | Saved people | bookmark / textSoft |
| Evening nudge | "38 people are talking now" | Home | radio / live |
| Report acted on | "We acted on a report you sent. Thank you." | none (row only) | shield / live |
| Host status | "You're approved to host I'm down rooms" | Host training and status | shield / live |

Thank-you notifications don't name the sender in the push (lock screens are public); the page itself names them.

## Rules
- Tapping marks as read and deep-links. If the target no longer exists (room ended), open the nearest useful screen with a toast ("That room has ended").
- Swipe left on a row: **Delete**.
- Connection-joined notices: at most one per connection per evening, and none during quiet hours.
- Evening nudge: at most once a day, around the user's usual opening time, off by default after 3 ignored nudges in a row.

## States
- Empty: bell illustration, "Nothing yet", "When a circle is about to start or someone thanks you, it shows up here."
- Loading: 6 row skeletons.

## Data
Notification: id, userId, type, payload (ids), text, createdAt, readAt.
