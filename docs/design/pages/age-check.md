# Age check

**Kind:** screen + stop state · **Release:** V1 · **Entry:** after SMS code, before nickname (new accounts only)

## Purpose
Circles is for adults only (your plan's open question; this spec assumes **18+**). Strangers talking by voice at night, including people who are struggling, is not a safe place for children.

## Layout
1. Back.
2. Title: "When were you born?"
3. Body: "Circles is for people 18 and over. We don't show your age to anyone."
4. Date of birth input: three fields Day / Month / Year with visible labels, number keyboard. (Not a scroll wheel; faster and more accessible.)
5. Primary: **Continue** (disabled until a full valid date).

## Stop state (under 18)
- Replace the screen with: heart icon in `raised`, title "Circles is for adults", body "You need to be 18 or older to use Circles. If you're going through something hard, you can still talk to someone:" followed by a help card with `[VERIFIED NIGERIA YOUTH OR CRISIS LINE]`.
- Primary: **Close**.
- The phone number is marked as under-18 until the stated 18th birthday, so retrying with a different date is blocked. Copy for a retry: "You've already told us your date of birth."

## Rules
- Store only the date of birth (for the 18+ check) and never display it.
- Self-declared age is not verification. Reports with the reason **Seems under 18** go to the console as high priority, and moderators can require ID or close the account.
- Invalid dates: inline error under the fields, "Check the date".

## Open questions for Sammy
- Confirm 18+.
- Is stronger age verification needed later (for example an ID check for hosts only)? Recommended for hosts of support rooms.
