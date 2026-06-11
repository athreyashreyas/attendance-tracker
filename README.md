# Attend

A local-first, iOS-installable PWA for tracking university attendance. Built with
Vite + React + TypeScript, Tailwind, Framer Motion, Dexie (IndexedDB), TanStack
Query, Zustand, and Supabase.

Reads always come from the local Dexie database, so the app is fully usable
offline. Writes are applied optimistically and replayed to Supabase by a sync
engine; realtime keeps other devices in step.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Supabase** — copy your project URL and anon key into `.env.local`:

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

3. **Create the schema** — open the Supabase SQL editor and run
   [`supabase/schema.sql`](supabase/schema.sql) top to bottom. This creates the
   tables, row-level security policies, `updated_at` + audit-log triggers, and
   adds the tables to the realtime publication.

4. **Run it**

   ```bash
   npm run dev      # http://localhost:5173
   npm run build    # production build + service worker
   npm run preview  # preview the production build
   npm run typecheck
   ```

## Using on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. The app runs
standalone (no browser chrome), respects the notch/home-bar safe areas, and works
offline once loaded.

## How it works

- **Local-first writes** — every mutation generates a client-side UUID, writes to
  Dexie immediately, enqueues a job in a Dexie `sync_queue`, then flushes to
  Supabase in the background. Deletes are soft (`deleted_at`); all Dexie reads
  filter them out.
- **Sync engine** (`src/lib/sync.ts`) — hydrates from Supabase (full first load,
  then `updated_at` deltas), replays queued writes with retry/backoff, and
  subscribes to realtime changes which it mirrors into Dexie.
- **Attendance math** (`src/lib/calculations.ts`) — cancelled sessions are
  excluded; computes the percentage, how many classes can still be missed, and
  how many consecutive attendances are needed to recover to the threshold.

## Project layout

```
src/
  components/   ui primitives, layout, course/session/calendar/auth components
  hooks/        TanStack Query hooks over Dexie + mutation helpers
  lib/          supabase, dexie db, sync engine, calculations, export, colors
  pages/        Auth, Dashboard, CourseDetail, QuickMark, Calendar, Settings
  stores/       zustand stores (auth, ui, sync)
  types/        shared TypeScript types
  utils/        date + record helpers
```
