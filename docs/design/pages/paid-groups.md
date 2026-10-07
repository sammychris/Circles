# Paid groups, payments and Circles Plus (Phase 3)

Talking stays free. Money exists only for hosted classes and Circles Plus. No gifts, no tipping, no leaderboards, nothing that turns money into status.

## Paid group detail
Same shape as group detail, with:
- Chips: "Hosted class", "Verified host".
- Title, schedule in `heading` ("Tuesdays and Thursdays, 7 pm"), "Next class tomorrow. 8 of 12 seats taken."
- Host row.
- **What you get**: 2 to 4 lines with check icons, written by the host (reviewed).
- Fixed footer: price ("[PRICE] a month"), "Cancel any time", ember **Join the class**, line "Talking rooms stay free. Only classes cost money."
- Member view: footer becomes "You're a member. Next payment [DATE]." with **Go to class** when a class is about to start.

## Join and pay (sheet)
1. Summary: class name, host, schedule, price per month.
2. What happens: "You'll pay [PRICE] today and on the same date each month. Cancel any time before then."
3. **Pay [PRICE]** (ember) → the payment provider's own screen (provider chosen in Phase 3; keep all provider code behind this one sheet).
4. Results: **Paid** ("You're in. See you Tuesday at 7 pm." + Add to calendar), **Failed** (reason and Try again; nothing charged), **Pending** ("We're waiting for your bank. We'll tell you when it's done.").

## Me › Payments and memberships
- Rows per membership: class, next payment date, price. Tap: membership detail with **Cancel membership** (quiet text, confirm sheet: "You'll keep your seat until [DATE].").
- Circles Plus row if subscribed.
- **Receipts**: one row per payment, tap for details.

## Host tools (verified hosts)
- **Set a price** (step in Start something and in Manage group): monthly price, optional per-class price later, size (10 default, 12 max). Shows "Circles keeps [CUT]% to run the app. You receive [AMOUNT] per member."
- **Earnings**: members, this month's total, Circles' cut, next payout date, list of payouts.
- **Payout account**: bank details, checked before the first payout.

## Circles Plus
Page in Me: what Plus adds (host tools, more on the table; final list decided later), price, Join and Cancel. Never needed to talk, join free rooms or get help.

## Safety and rules
- Only verified hosts can charge. Verification and payout checks happen in the console.
- Refund requests go to the console; the member sees status in the membership detail.
- If a paid host is suspended, members are notified and charged nothing further.

## Data
Membership (userId, groupId, status, price, nextPaymentAt), Payment (id, membershipId, amount, status, providerRef), Payout (hostId, amount, status), PlusSubscription.
