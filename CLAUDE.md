# Circles

Circles is a place where you come in and feel better with people: small voice rooms of real people who talk, play, make friends, get support and learn together. Voice comes first. The heart of the app is people who need someone to talk to.

Sammy owns the product and decides. You (Claude Code) build it, one step at a time.

## Always loaded

@docs/CIRCLES_INTENT.md
@docs/CIRCLES_ARCHITECTURE.md
@docs/CIRCLES_BUILD_PLAN.md

## Read when you need them

- `docs/CIRCLES_DESIGN_DIRECTION.md`: how everything looks and feels. Read it before building or changing any screen.
- `docs/design/tokens.json`: every colour, size, spacing and font value.
- `docs/design/pages/`: detailed rules for individual screens and flows.
- `docs/screens/`: pictures of the designed screens. `docs/screens/INDEX.md` says which picture belongs to which build step. Only open the ones for the current step.
- `docs/PROGRESS.md`: what has been built and decided so far. Read it at the start of every session and update it at the end of every step.
- `docs/NEXT.md`: the to-do list for the next session (decisions waiting for Sammy, his steps, what's left to build). Read it right after PROGRESS.md.

## When documents disagree

1. `CIRCLES_INTENT.md` wins on purpose and flow.
2. `CIRCLES_ARCHITECTURE.md` wins on technology.
3. `CIRCLES_BUILD_PLAN.md` wins on what to build and in what order.
4. `CIRCLES_DESIGN_DIRECTION.md` and `tokens.json` win on how it looks.
5. Screenshots show layout only.

If something is still unclear, ask Sammy. Don't guess on anything that touches safety, money or privacy.

## How to work with Sammy

Sammy is not technical with terminals. So:

- Explain everything in plain words. No jargon without a one-line explanation.
- Before Sammy has to do anything (create an account, click something, copy a key, plug in a phone), give numbered steps that say exactly what to click or type, and why.
- Before running anything that installs software, costs money, or needs an account, say what it is and wait for his yes.
- Keep messages short. One decision at a time.

## How to build

- **One build-plan step at a time.** Explain the step in plain words first, and wait for Sammy's yes before building it.
- **Finish every step the same way:**
  1. Run all tests and fix what fails.
  2. Use the `circles-reviewer` agent to check the screens you built against the design and the safety rules, and fix what it finds.
  3. Give Sammy a short phone checklist: what to tap, and what should happen.
  4. Update `docs/PROGRESS.md`.
  5. Ask before saving the work with git.
- **Don't redesign screens.** Build what's in `docs/screens/` and the design direction. If a design seems wrong for a real phone, explain why and ask.
- **Use the theme, not raw values.** Turn `docs/design/tokens.json` into one theme file once and use it everywhere.
- **Keep secrets out of the code.** API keys and passwords go in environment files that are never committed. Tell Sammy where each key comes from.
- **Row Level Security on every Supabase table**, as the architecture says.

## Saving work with git

- **Commits are signed as Sammy**, so they count on his GitHub activity graph: before the first commit in a session, run `git config user.name "Samuel Christopher"` and `git config user.email "ebusameric@gmail.com"`. (Sammy's decision, October 2026.)
- **Credit Claude in every commit message** with a `Co-Authored-By: Claude <noreply@anthropic.com>` line at the end (plus any other attribution lines the session asks for).
- **Work goes to a side branch, then into `main` through a pull request.** Open the pull request and merge it when Sammy asks. After a merge, start the next work from the latest `main`.
- Never rewrite `main`'s history (no force-push to `main`).
- **Setting up the project:** create the Expo app inside this folder without deleting or moving `docs/`, `CLAUDE.md` or `.claude/`. If the setup tool refuses because the folder isn't empty, create it in a temporary folder and move the files in.

## Never

- Never show anyone that a person is in a support ("I need someone to talk to") room. Not friends, not "in a room".
- Never put games, adverts or shared photos in support rooms.
- Never let a game vote, role or result remove or mute a real person.
- Never keep scores, streaks or rankings after a room ends.
- Never let someone speak before they've passed the 18+ question and chosen a nickname. During the open test (Sammy's decision, October 2026) email is optional; email and phone checks become required later, when Sammy decides.
- Never show a real name or phone number. Only the chosen nickname.
- Never show who saved or followed whom. Saves only connect when both people save each other, and only those two people see the connection.
- Never leave placeholder text like `[VERIFIED NIGERIA CRISIS LINE]` in a build meant for real users. Stop and tell Sammy.
