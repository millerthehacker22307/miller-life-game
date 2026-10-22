# Miller's Life Game ⚔️

A gamified habit tracker — your life as an RPG. Complete daily quests, earn XP,
level up, and keep the streak alive.

## What it does

- **Player HUD** — Player card for Miller ("Player One") with level, rank title,
  an XP progress bar to the next level, total XP, day streak 🔥 and best streak.
- **Daily Quests** — 12 default quests tailored to Miller's routine (UPSC study,
  LeetCode, Cyberox, gym, deep work, pure-veg food, sleep before 11 PM and more).
  Ticking a quest awards XP with a floating +XP animation; unticking removes it.
  Custom quests can be added (with their own XP value) and deleted.
- **Levels & ranks** — XP ladder from Lv 1 *Rookie* through *Grinder*,
  *Disciplined*, *Machine* up to Lv 50 *Unstoppable*, with a glow pulse on level-up.
- **Stats** — today's completion %, 7-day average, all-time rate, active days,
  plus a hand-rolled SVG consistency chart for the last 14 days.
- **History** — day-by-day log of past days with completion % and XP earned.
- **Persistence** — everything is stored in the browser's `localStorage`
  (per-date quest map + XP ledger). A new day starts a fresh quest log while
  history is preserved. A Reset button (with confirmation) lives in the footer.

## Tech

One self-contained static page — `index.html` with inline CSS and vanilla
JavaScript. No build step, no dependencies, no backend. Just open it or deploy
it to any static host.

## Run locally

Open `index.html` in any modern browser. Progress is saved automatically on
that device/browser.
