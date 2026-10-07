# Learn together (launch: free practice groups; paid classes later)

**Kind:** space + language/subject page + Practise now + handoff landing

## Learn together door page (from Home)
- **Practise now** (ember): matches into a practice room by language and level. Needs a level the first time ("What's your Igbo like?" Beginner, Getting there, Fluent).
- **Languages:** 2-column tiles, 96 tall: name (18/800), greeting in that language (`textSoft`), "12 groups" (`meta`). Sorted by activity.
- **Skills:** rows with icon, name, "4 groups this week".

## Language or subject page (e.g. Igbo)
1. Back; title "Igbo" (`display`); line "Kedu! Practise speaking with people learning at your level."
2. **Practise Igbo now** (ember) and "Your level: Beginner. Change".
3. **Practice groups**: "Free. Up to 7 people, everyone talks." Rows: day/time block, title, one line (seats or what it covers), Join.
4. **Hosted classes**: "Paid monthly. Up to 12 people with a verified host." Cards: host avatar, title, "Hosted by Chioma, verified", schedule, price on the right. Opens paid group detail.
5. Quiet link: "Start an Igbo practice group".

## Practise now (state)
Same as Talk now's "Finding your room", text "Finding people at your level". Fallback after 15 seconds: the next practice group today and "Start one now".

## In a learning room
- The circle of seats, as any room.
- The host (or anyone, in free groups) can put **Words** on the table: up to 10 words or phrases with meanings, revealed one at a time.
- Rules: everyone talks. Hosts are reminded to give each person a turn (Take turns activity is allowed).

## Coming from the Igbo app
The Igbo app links to `circles://learn/igbo?level=beginner&from=igbo-app`.
- Signed in: open the Igbo page with a banner "Welcome from the Igbo app. Ready to practise out loud?" and the level already set.
- Not signed in: Welcome screen with "Practise your Igbo with real people" above the headline, then sign-up, then the Igbo page.
- Offer "Start a group with friends from the Igbo app" (creates an invite-only practice group and a share link).

## Data
Space, Language (code, name, greeting, levels), Group.kind = learn.practice | learn.class, Group.language, Group.level, Words table item payload.
