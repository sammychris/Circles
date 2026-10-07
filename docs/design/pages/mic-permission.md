# Microphone permission

**Kind:** sheet + blocked state · **Release:** V1 · **Entry:** the first time the user joins any room (not during sign-up)

## Purpose
Phones only ask for the microphone once. If the user says no by accident, voice won't work and many never find the setting. So explain first, then ask.

## Sheet: before the phone's prompt
1. Mic icon in an `emberSoft` 64 px circle.
2. Title: "Circles needs your microphone to let you talk"
3. Body: "You'll still join muted. Your mic only goes live when you tap the mic button. We never record rooms."
4. Primary: **Allow microphone** → triggers the system prompt.
5. Tertiary: **Just listen for now** → joins the room as a listener with the mic control in the paused state "Mic not allowed · Turn on".

## Blocked state (user declined, now or earlier)
- In the room, the mic control reads "Mic is off in your phone settings" and tapping it opens a sheet:
  - Title: "Turn on your microphone"
  - Steps for the user's platform (two lines max), e.g. "Settings › Circles › Microphone".
  - Primary: **Open settings** (deep link to the app's settings page).
  - Tertiary: **Keep listening**.
- When the user returns with permission granted, the control updates to "You're muted / Tap to talk" with a toast "Microphone ready".

## Rules
- Never ask for the microphone at launch or during sign-up.
- Notifications permission follows the same pattern but is asked **after the first room** ends: "Want a reminder before your circles start?" with **Turn on reminders** / **Not now**.
