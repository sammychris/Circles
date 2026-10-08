# Good morning, Sammy

> **Newer:** after this page, I built five more features. Their to-do list and phone checklist are at the end of `docs/BUILD_NOTES.md`. Do this page first if you haven't, then that one.

While you slept I built Steps 2b to 7. Everything is saved on GitHub, on the branch `claude/gallant-faraday-7s2l1w`.

This page is everything **you** need to do, in order. Each part is short. It should take about 45 minutes, plus the wait while Expo builds the app.

**Before you test, one thing to know:** support rooms only let people talk once **3 people** are in them. Every other room goes live as soon as **2 people** are in it. (Changed after this page was first written: see `docs/NEXT.md`, item 1.)

---

## Part 1: Supabase (about 15 minutes)

Open your project at https://supabase.com/dashboard. On GitHub, switch to the branch `claude/gallant-faraday-7s2l1w`.

### 1a. Three database updates

Do this three times, once for each file below, in this order:

1. `supabase/migrations/20261009000000_step2b_safety.sql` (reports, blocks, removing people)
2. `supabase/migrations/20261009010000_step3_rooms.sql` (rooms, saves, hosts)
3. `supabase/migrations/20261009020000_impostor.sql` (Find the Impostor: secret cards and votes)

For each one:

1. On GitHub, open the file. Click the **Copy raw file** button, the two-squares icon at the top right of the code.
2. In Supabase, go to **SQL Editor**, then **New query**. Paste, and click **Run**. If it warns about "destructive operations", click to run anyway.
3. It should say **Success**.

Both are safe to run again if you're not sure one worked.

### 1b. Update the room server (the `livekit-token` function)

1. On GitHub, open `supabase/functions/livekit-token/index.ts` and click **Copy raw file**.
2. In Supabase, go to **Edge Functions**, click **livekit-token**, then the **Code** tab.
3. Select all the old code, delete it, paste the new code, and click **Deploy**.

### 1c. Make yourself a trained host

Support rooms ("Need someone to talk to") only ever open with a trained host. Right now there are none, so that door will say "No host is on right now".

1. Open the app and pick your nickname first (Part 2), if you haven't already.
2. In Supabase, go to **SQL Editor**, then **New query**. Paste this, but change `YourNickname` to your real nickname in the app:

```sql
insert into public.hosts (user_id, note)
select id, 'Sammy' from public.profiles where lower(nickname) = lower('YourNickname')
on conflict do nothing;
```

3. Click **Run**. It should say "Success. 1 row".

Do the same for any trusted friend who should host support rooms.

### 1d. Let lots of people sign up

Supabase only allows about 30 new accounts per hour from one internet connection. Nigerian mobile networks put many people behind one connection, so raise it before you share the app.

1. Go to **Authentication**, then **Rate Limits**.
2. Find the anonymous sign-ins limit and raise it, for example to **1000**.
3. Click **Save**.

---

## Part 2: Build the new app (5 minutes, then about 20 minutes waiting)

In PowerShell, in your `Circles_app` folder, paste these one at a time:

```
git stash
```
```
git pull origin claude/gallant-faraday-7s2l1w
```
```
npm install
```
```
npx eas-cli build --profile preview --platform android
```

When it finishes, install it from the link on each phone, the same as before.

---

## Part 3: Phone test (needs 3 phones or friends)

Tick each one. If something is wrong, tell me what you tapped and what you saw.

**Home and doors**
- [ ] Home shows "What brings you in tonight?", the "Need someone to talk to?" line, and four doors.
- [ ] Tap your avatar (top right). You see Me, with Blocked people, Log out and Delete my account.

**Talking**
- [ ] I want to talk: pick "Want to laugh" (or nothing), then tap **Find my room**. You get a room.
- [ ] On the other phones do the same. All three end up in the **same** room. The app fills existing rooms first.
- [ ] On your own it says "Nobody's here yet", and the mic says "Mic paused / Waiting for someone to join".
- [ ] When the 2nd person arrives, the mic turns orange ("You're muted / Tap to talk"). Talk.
- [ ] Everyone else leaves. The last person sees a **2-minute countdown** ("Waiting for someone to join") and the mic pauses. Someone joining again brings the room back.
- [ ] The lock-screen notification says only "Circles", never the room's name.

**Block and Report**
- [ ] Tap someone's seat. You see Save, Block and Report.
- [ ] Report: pick a reason, then Send. You see "Thanks for telling us". Then check Supabase (Table Editor, **reports**): your report is there.
- [ ] Block someone. You stop hearing them. Next time you tap Find my room, you're never put in a room with them.
- [ ] Me, Blocked people: Unblock works.

**After the room**
- [ ] Leave. You see "Thanks for being there", the people, a heart (thank-you) and **Save**.
- [ ] Two people save each other. Both see each other under **My people**. Nobody else does.

**Support**
- [ ] After Part 1c, open "Need someone to talk to?" on your phone and tap **Come in**. You open a support room as host.
- [ ] A friend taps Come in and joins **your** room. There's no Ludo there, and "Get help" works.
- [ ] Without a host online, the door says "No host is on right now" and offers help.

**Ludo**
- [ ] I'm bored, then **Play now**, on 3 phones. Once all 3 are in, tap **Play Ludo**.
- [ ] Teams Sun and Sky appear. Only the team whose turn it is can roll, and everyone sees the same board.
- [ ] A 6 lets you bring out a token. Landing on the other team sends them back to base.
- [ ] **End game** (for whoever started it) or **Leave game** works, and everyone keeps talking.

**Find the Impostor**
- [ ] In a game room with 3 or more people, tap **Play a game**, then **Find the Impostor**.
- [ ] Everyone but one sees the same word ("Your word, only you see it"). One phone says "You're the impostor".
- [ ] The row at the top shows who's talking, who's next and who's done. Each person gets 30 seconds.
- [ ] After everyone has spoken, everyone votes. The answer only shows once everyone has voted (or after a minute).
- [ ] Nobody is muted or removed by the vote. **Next round** gives a new word, up to 3 rounds.
- [ ] **Hide word** covers your word if someone is sitting near you.

**Lagos mobile data**
- [ ] A friend somewhere else, on their own mobile data, joins a room with you. Is there any delay or dropping out? Note the "You joined in…" number.

---

## Part 4: Things only you can decide or give me

1. **Helpline numbers.** Send me a real, checked Nigerian **crisis line** (name and number) and the **emergency number** you want shown. Until then, the help screens say "contact your local emergency services or go to the nearest hospital", with no number. I won't guess one.
2. **Youth helpline** for the under-18 screen. It's the same idea.
3. **Privacy Policy and Terms.** Done: see part 1 of `docs/BUILD_NOTES.md`.
4. **Thank-yous.** People can send a private thank-you after a room. I store them, but I don't show anyone a total, because the rules say "never keep scores". Do you want people to see something, like "Someone thanked you"? Or nothing?
5. **Support rooms hold 10 now.** Done: see part 10 of `docs/BUILD_NOTES.md`.
6. **The "You joined in…" numbers** under the room circle are for testing. Tell me when to remove them.

---

## How to run Circles day to day

- **Read reports:** Supabase, then Table Editor, then **reports**. Urgent ones ("Someone may be in danger") have `urgent` = true. Set `status` to `reviewing`, `actioned` or `dismissed` as you go.
- **Remove someone from the app.** In SQL Editor, change the nickname and run:

```sql
insert into public.bans (user_id, reason)
select id, 'Hate or harassment' from public.profiles where lower(nickname) = lower('TheirNickname');
```

  They can't join rooms any more and see "Your account has been closed". For a pause instead, add an end date: `insert into public.bans (user_id, reason, until) select id, 'Unkind', now() + interval '7 days' from …`. To undo it, delete their row in the **bans** table.
- **Remove someone from a room right now:** LiveKit Cloud dashboard, then Rooms, then the room, then the person, then **Remove**.
- **The web version:** in PowerShell, run `npx expo start --web`. Circles opens in your browser. See the "Web check" section in `docs/PROGRESS.md` for what works there.
