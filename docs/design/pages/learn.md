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


**Changes (Sammy, 2026-10-11):** languages and skills use one card style (skills show a short line: "Everyone gets a turn", "Solve small problems"); a language card shows its hello in quotes with a wave ("“Kedu!” 👋"); "N groups open now" shows in green only when a group is open (no "Be the first"); the button says "Practise <subject> again" with "Last time: <subject>, <level>. Tap a card to change." under it, or "Pick what to practise" and "We'll ask your level, then match you" for someone new.

**Categories and coming soon (Sammy, 2026-10-11):** under the header, format pills Practise (on) and Quiz, Challenge, Debate (greyed, "· Soon", with the line "Quiz, Challenge and Debate rooms are coming soon. For now, every room is for practising."). Then category pills: Nigerian languages, Other languages, Skills (opens on the category of the last subject). Each category shows its open subjects, then greyed "Coming soon" cards from `SOON` in `src/rooms/learn.ts`. **Not built yet (front end only, nothing in the database or room server):** Quiz, Challenge and Debate rooms; the subjects Efik, Tiv, Urhobo, Edo, Ijaw, Fulfulde, Spanish, Arabic, Swahili, Portuguese, German, Mandarin, Job interviews, Pitch your idea, Storytelling, Exam prep, Money basics and Negotiation.

**Subject page (Sammy, 2026-10-11):** under the subtitle, "Your level: Beginner · Change" (or "not set yet · Choose"), before matching; "Practice groups" with "Free voice room · up to 7 people, everyone talks." and, when empty, "No groups open yet. Start one and others at your level will join." (both body size); "Host your own group" with "Pick its name and time, now or later" (opens Start; Practise now matches you straight away); "Classes with teachers are coming soon." (not built). Under the button: "Voice only. If nobody's in yet, you wait in the room until someone joins."
