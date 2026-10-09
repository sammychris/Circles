# Circles — Architecture

Read this together with CIRCLES_INTENT.md and CIRCLES_DESIGN_DIRECTION.md.
The UI design already exists. Build on it; do not redesign screens.

## The stack (decided)

| Part | Choice | Why |
|---|---|---|
| App | Expo React Native (one codebase) | Android store app first, web from the same code later. Not Next.js. |
| Database, login, live updates | Supabase (Postgres inside) | Same as LocalLoop. Auth, database, Realtime, Edge Functions in one place. |
| Live voice | LiveKit Cloud | Official Expo plugin, same SDK family for Android and web, open source (can self-host later). |
| Voice backup | Agora | Switch only if LiveKit voice is poor from Lagos in Step 1. |
| Sign-up | Supabase anonymous accounts (nickname + 18+) during the open test; optional email added to the same account. Later: email required, then phone + Send SMS hook → Termii | Sammy wants the open test as easy as possible. Email and phone checks come later against bots and ban evasion. |
| Game moves | Supabase Realtime | Turns and moves sync live between players in a room. |

## How the pieces connect

1. User signs up with a nickname and the 18+ question (Supabase anonymous account); email optional, phone later. Only their chosen nickname is ever shown.
2. User joins a room → app asks a Supabase Edge Function for a LiveKit access token.
3. Edge Function checks the room rules (capacity, paid access, room open), then returns the token.
4. App connects to the LiveKit room for voice.
5. Room membership, room state and game moves live in Supabase and update live for everyone in the room.

## Voice rules that must hold

- Voice keeps running when the screen locks or the user switches apps (Android foreground service with a visible notification). This is non-negotiable.
- Voice first. Video is an optional feature, off by default.
- Requires a development build (LiveKit does not run in Expo Go). Use EAS builds.

## Room rules (from the Circles plan)

- Free peer rooms: 6–7 people.
- Paid hosted rooms: default 10, max 12; only paying members join (payments come later).
- Support ("I need someone to talk to") rooms need 3 people (and a trained host); if one drops to 2, a short countdown starts, then the room closes. Every other room can start with 1 person waiting and goes live at 2; if it drops to 1, the same countdown runs. Each game keeps its own minimum (Sammy's decision, 2026-10-08).
- New people are placed into existing rooms before new rooms are opened.
- Connections/follows are private and never displayed.

## Starting data tables (keep small, grow per step)

- profiles — id, nickname, created_at
- rooms — id, kind (peer / hosted), mood_or_topic, host_id, capacity, status (open / closing / closed), scheduled_at, livekit_room_name
- room_members — room_id, user_id, role, joined_at, left_at
- connections — user_id, other_user_id, created_at (private to the user)
- game_sessions — id, room_id, game, state, current_turn, status
- Row Level Security on every table.

## Later (not now)

Paid hosted rooms and payments (Paystack or similar), gifts, Circles Plus, the Table, iPhone build, installable web version.
