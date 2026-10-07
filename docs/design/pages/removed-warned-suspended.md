# You were removed · Warning notice · Account suspended

**Kind:** 3 screens · **Release:** V1
These are the screens a person sees when they did something wrong. Tone: firm, calm, never shaming. Always say what happened, which rule, and what they can do now.

## 1. You were removed (from one room)
**When:** a host removed them. Shown full screen right away.

Layout:
- `dangerSoft` circle with `log-out` icon in `danger`.
- Title: "You were removed from this room"
- Body: "The host removed you for: **Unkind or insulting**." (the reason the host picked)
- Rule card (`surface`): the matching room rule, e.g. "Be kind. Everyone here is a person."
- Body: "You can't rejoin this room, but you can join others."
- Primary: **Back to Home**
- Tertiary: "This wasn't fair" → short form (text, 300 chars) that goes to the console as an appeal attached to the removal.

No timer, no count of past removals shown.

## 2. Warning notice
**When:** a moderator issued a warning from the console. Shown once, the next time they open the app, before Home.

Layout:
- `emberSoft` circle with `alert-triangle` in `ember`.
- Title: "A reminder about our rules"
- Body: "Someone reported something you said in a room on **Sat 3 Oct**. We looked into it, and it broke this rule:"
- Rule card with the rule.
- Body: "If it happens again, your account may be paused."
- Primary: **I understand** (required to continue; this records acknowledgement)
- Tertiary: "This wasn't me" → appeal form.

## 3. Account suspended
**When:** a moderator suspended or banned the account. Replaces the whole app until it ends.

Layout:
- `dangerSoft` circle with `ban` icon in `danger`.
- Title: "Your account is paused" (temporary) or "Your account has been closed" (permanent).
- Body (temporary): "Until **Sat 10 Oct, 9:00 pm**, because of repeated reports for: **Hate or harassment**."
- Body (permanent): "Because of a serious breach of our rules: **{reason}**. This phone number can't be used for a new account."
- Rule card.
- Primary: **Appeal** → appeal form (one per suspension). After sending: "We'll reply within 3 days by notification."
- Secondary: **Read the rules**
- Tertiary: **Log out**
- Settings › Delete account must remain reachable from here (law and app stores).

## States
- Appeal sent: replace the Appeal button with "Appeal sent on Sat 3 Oct. We'll reply within 3 days."
- Appeal answered: notification + the outcome on this screen.

## Data
Removal: roomId, userId, hostId, reason, at, appeal?
Warning: userId, reportId, rule, issuedBy, acknowledgedAt.
Suspension: userId, type (temporary | permanent), until, reason, rule, issuedBy, appeal { text, status, reply }.

## Open questions for Sammy
- Appeal reply time: 3 days is a placeholder; set it to what your team can really do.
