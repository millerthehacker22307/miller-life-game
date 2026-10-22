# Life Game ⚔️

**Make your life a game.** Life Game turns your daily habits into an RPG:
complete daily quests, earn XP, level up, raise your rank and keep your streak
alive — right from your browser, on any device.

🔗 **Play:** https://miller-life-game.vercel.app

## How it works

- **Create a free account** — pick a username and password on the
  [register page](https://miller-life-game.vercel.app/register). That's it:
  no email, no downloads.
- **Your progress lives on the server**, tied to your account. Log in from
  your phone, laptop or a friend's computer and your quests, XP and streaks
  are exactly where you left them. Every player has their own private game —
  nobody can see or touch anyone else's progress.
- **Daily Quests** — 12 quests for everyone (wake up early, workout, a study /
  deep-work session, skill practice, meditation, cold shower, reading, healthy
  meals, 3L of water, no junk food, plan tomorrow, sleep before 11 PM), each
  worth XP. Add your own custom quests with your own XP values.
- **Levels & ranks** — climb from Lv 1 *Rookie* through *Grinder*,
  *Disciplined* and *Machine* up to Lv 50 *Unstoppable*, with a level-up glow
  when you cross a threshold.
- **Stats & history** — today's completion %, 7-day average, all-time rate,
  active days, a 14-day consistency chart, and a day-by-day history log.
  A new day starts a fresh quest log; your history and XP stay.

## Tech

- **Next.js** (App Router) + React — one app for the game UI, auth pages and
  API routes.
- **Turso / libsql** (SQLite in the cloud, Mumbai region) for accounts and
  per-user game states.
- **Auth, hand-rolled** — passwords hashed with Node's `scrypt` (per-user
  salt), sessions are HMAC-signed httpOnly cookies (30-day expiry). State
  reads/writes derive the user only from the verified session, so accounts
  are fully isolated.
- **Client** — the game HUD (dark cinematic blue, glassy panels, SVG
  consistency chart, floating +XP) saves to the server automatically
  (debounced) and mirrors to `localStorage` as an offline cache. Players who
  used the original single-device version get their old progress imported
  once, automatically, on first login.
- Deployed on **Vercel**.

## Run locally

```bash
npm install
npm run dev
```

Without any environment variables the app uses a local file database
(`local-dev.db`). For production parity set:

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | libsql/Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `SESSION_SECRET` | Secret used to sign session cookies |

---

Created by Miller
