# Attend

**A calm, local-first attendance tracker that lives on your home screen.**

Attend helps you keep every class above its attendance line without the spreadsheet
fuss. Add your classes, mark each session in a tap, and the app tells you exactly
where you stand: how many you can still miss, how many you need in a row to recover,
and where you will land by the end of term. It installs to your phone or iPad like a
native app, works fully offline, and quietly backs everything up to your own account.

Built with Vite, React, TypeScript, Tailwind, Framer Motion, Dexie (IndexedDB),
TanStack Query, Zustand, and Supabase.

---

## What makes it different

- **Classes are the unit, not semesters.** Track a degree subject grouped under a
  semester, or a free-flowing dance or hobby class with no semester at all. Filter
  your view by All, a specific semester, or standalone classes.
- **It looks forward, not just back.** Beyond your current percentage, Attend
  projects the rest of the term: classes still to come, how many you can skip, and
  your best-case and worst-case final standing.
- **Plan ahead, mark later.** Drop a class onto a future day as "scheduled" and
  record how it actually went on the day itself. Planned classes never touch your
  percentage until you decide them.
- **Breaks that fit reality.** Cancel a holiday or exam week across a date range for
  every class at once, or just the few that are actually off.
- **Always current.** New versions flow in on their own, with a friendly in-app
  "What's new" so you can see exactly what changed without reinstalling anything.
- **Offline by default.** Reads come straight from a local database, so the app is
  instant and fully usable with no signal. Edits sync in the background when you are
  back online.
- **Designed to feel native.** A sidebar rail on iPad and in landscape, a bottom tab
  bar on phones, safe-area aware layout, a warm parchment palette, and gentle motion
  throughout.

---

## Features

**Your classes, your way**
- Optional semesters: link a class to one, or let it stand alone.
- Per-class schedule days, start and end dates, and a custom attendance threshold.
- 16 muted, distinct colours so every class is easy to tell apart.

**Attendance intelligence**
- Live attendance percentage against your threshold.
- "You can miss N more" and "attend N in a row to recover" guidance.
- Whole-term projection with best-case and worst-case final percentages.
- Cancelled classes are excluded from the maths automatically.

**Quick Mark**
- A swipeable card deck for the day's classes.
- Opens on the first class you still need to mark, and steps aside once the day is
  done so you never re-mark by accident.

**Calendar and planning**
- Month calendar showing marked classes (filled dots) and scheduled ones (outlined).
- Tap any day to mark classes, add an extra one, or leave it scheduled for later.
- A break tool to cancel a date range across all classes or a chosen few.

**Your data**
- Export everything as JSON, or a single class's attendance as CSV.
- Everything lives on your device and syncs to your own Supabase account.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Build / framework | Vite, React 18, TypeScript (strict) |
| Styling / motion | Tailwind CSS v3, Framer Motion |
| Local store | Dexie (IndexedDB), source of truth for all reads |
| Server state | TanStack Query |
| App state | Zustand |
| Backend | Supabase (Postgres, Auth, Realtime, Row-Level Security) |
| PWA | vite-plugin-pwa (Workbox), installable + offline |

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- A free [Supabase](https://supabase.com) project

### 1. Install

```bash
npm install
```

### 2. Configure Supabase

Copy your project URL and anon key into `.env.local`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 3. Create the database

Open the Supabase SQL editor and run [`supabase/schema.sql`](supabase/schema.sql)
top to bottom. It creates the tables, row-level security policies, the `updated_at`
and audit-log triggers, and adds the tables to the realtime publication. This file is
the full, current schema, so a fresh project needs nothing else.

> Upgrading an existing deployment instead of starting fresh? Apply the numbered
> files in [`supabase/`](supabase/) in order (`migration-002`, `migration-004`,
> `migration-005`). They are incremental and already folded into `schema.sql`.

### 4. Run

```bash
npm run dev       # start the dev server at http://localhost:5173
npm run build     # type-check and build the production bundle + service worker
npm run preview   # preview the production build locally
npm run typecheck # type-check only
```

---

## Install on your phone or iPad

Open the deployed URL in Safari, then **Share → Add to Home Screen**. Attend launches
standalone with no browser chrome, respects the notch and home-bar safe areas, and
keeps working offline once it has loaded.

## Deploy

Any static host works. The project is set up for Vercel: it serves the built `dist/`
output and uses [`vercel.json`](vercel.json) to route all paths to the SPA. Set the
two environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in your
host's project settings, since they are not committed.

---

## How it works

For the curious, the parts that make the offline-first experience tick:

- **Local-first writes.** Every change generates a client-side UUID, writes to Dexie
  immediately, enqueues a job in a Dexie `sync_queue`, and flushes to Supabase in the
  background. Deletes are soft (`deleted_at`), and all reads filter them out.
- **Sync engine** ([`src/lib/sync.ts`](src/lib/sync.ts)). Hydrates from Supabase (a
  full first load, then `updated_at` deltas), replays queued writes with retry and
  backoff, and subscribes to realtime changes that it mirrors back into Dexie.
- **Attendance maths** ([`src/lib/calculations.ts`](src/lib/calculations.ts)).
  Computes the live percentage, the cushion of classes you can still miss, the
  catch-up needed to recover, and the forward-looking term projection. Planned and
  cancelled sessions are handled so they never distort the totals.
- **Native-feeling layout.** The shell is sized to the real visible viewport so the
  bottom navigation sits flush on iOS in any orientation, with bottom sheets that lift
  above the keyboard.

### Project structure

```
src/
  components/   ui primitives, layout, course/session/calendar/auth components
  hooks/        TanStack Query hooks over Dexie + mutation helpers
  lib/          supabase, dexie db, sync engine, calculations, export, colours, changelog
  pages/        Auth, Dashboard, CourseDetail, QuickMark, Calendar, Settings
  stores/       zustand stores (auth, ui, sync)
  types/        shared TypeScript types
  utils/        date + record helpers
supabase/       schema.sql (full schema) + numbered migrations
```

### Versioning

Versions follow `MAJOR.MINOR.PATCH`. The app is pre-1.0, so the leading digit stays
`0`; the minor bumps for feature batches and the patch for fixes and polish. The
release notes in [`src/lib/changelog.ts`](src/lib/changelog.ts) are the single source
of truth for the current version and power the in-app "What's new" list, where feature
releases are flagged as major.

---

## Privacy

Your classes and attendance live on your device first and sync to a Supabase project
you control, isolated per account by row-level security. There is no third-party
analytics or tracking.
