# Attend — Codebase Walkthrough

A file-by-file tour of the app, from the big picture down to each module. Read the
"Mental model" first; the rest is reference you can jump around in.

---

## 1. Mental model

Attend is a **local-first PWA**. The golden rule that explains almost every design
choice:

> **The UI always reads from the local database (Dexie/IndexedDB). It never reads
> from Supabase directly. Supabase is a backup and a sync channel, not the read path.**

So a write is: update Dexie immediately (the screen updates), queue the change, and
replay it to Supabase in the background. A remote change is: pulled into Dexie, then
the UI is told to re-read. This is why the app is instant and works offline.

Three layers:

1. **Data layer** (`src/lib`, `src/hooks`) — Dexie, the Supabase client, the sync
   engine, and TanStack Query hooks that read Dexie.
2. **State** (`src/stores`) — small Zustand stores for auth, sync status, and the
   current view filter.
3. **UI** (`src/pages`, `src/components`) — pages composed from reusable primitives
   and feature components.

Data flow in one diagram:

```
   UI (React)
     │  reads via TanStack Query hooks
     ▼
   Dexie (IndexedDB)  ◄── sync engine writes pulled rows
     │  every write also...
     ├─► sync_queue ──► SyncEngine.flushQueue ──► Supabase (Postgres)
     │                                                  │
     └◄──────── realtime + initialHydrate ◄─────────────┘
```

The domain has three tables: **semesters**, **courses** (a "class"), and **sessions**
(one class on one date, marked present/absent/cancelled/planned).

---

## 2. Entry and bootstrap

- **`index.html`** — the HTML shell. Sets iOS PWA meta tags (`apple-mobile-web-app-*`),
  the viewport with `viewport-fit=cover` (so content can use the full screen and the
  safe-area insets), theme colour, and mounts `#root`.
- **`src/main.tsx`** — creates the React root and renders `<App/>`. Also contains the
  **live-update logic**: it listens for the service worker's `controllerchange`
  (a new version took over) and, after the first install, fires an `attend:updating`
  event and reloads. It re-checks for updates on focus / visibility / every 30 min,
  because iOS only re-checks a PWA on cold launch.
- **`src/App.tsx`** — `AppInner` wires everything together:
  - `useViewport()` for the keyboard-aware CSS variable.
  - `initAuth()` once, and `syncEngine.attachNetworkListeners()`.
  - On sign-in **and on every foreground** (`focus`/`visibilitychange`), it calls
    `syncEngine.initialHydrate(userId)` to pull fresh changes.
  - `useRealtime(userId)` to subscribe to live changes.
  - Renders the `RouterProvider`, plus the global `QuotaToast` and `UpdateOverlay`.
  - `App` wraps `AppInner` in the TanStack Query `QueryClientProvider`.

---

## 3. Configuration and tooling

- **`package.json`** — scripts: `dev`, `build` (`tsc --noEmit && vite build`),
  `preview`, `typecheck`. Dependencies are the stack: React, React Router, TanStack
  Query, Zustand, Dexie, Supabase, Framer Motion, date-fns, lucide-react.
- **`vite.config.ts`** — React plugin + `VitePWA`. Splits vendors into stable chunks
  (`react`, `supabase`, `motion`, `query`, `data`) so the service worker can cache
  them independently. PWA manifest (name, icons, `orientation: 'any'`, standalone) and
  Workbox runtime caching for Google Fonts. `registerType: 'autoUpdate'`.
- **`tailwind.config.js`** — the design system: the `parchment`/`ink`/`sage`/`rose`/
  `amber` colour scales, the `card`/`sheet`/`fab` border radii, and the `pulse-dot`
  keyframe. This is where the warm palette is defined.
- **`src/index.css`** — Tailwind layers, the safe-area CSS variables, the body lock
  (`overflow: hidden; height: 100%`), the `html` height formula
  `min(calc(100dvh + env(safe-area-inset-top)), 100lvh)` that makes the shell sit flush
  on iOS, and the `.scroll-ios` / `.pt-safe` / `.pb-safe` utilities.
- **`vercel.json`** — SPA rewrite so all routes serve `index.html`.
- **`tsconfig*.json`, `postcss.config.js`** — strict TypeScript and the
  Tailwind/autoprefixer PostCSS pipeline.

---

## 4. Types — `src/types/index.ts`

The single source of domain shapes:

- `SessionStatus = 'present' | 'absent' | 'cancelled' | 'planned'`. `planned` is a
  class placed on the calendar but not yet decided.
- `Semester`, `Course` (note `semester_id: string | null` — a class can stand alone),
  `Session`, `AuditLog`.
- `SchedulePeriod` — one timetable and the date it took over. `Course.schedule_history`
  is a list of them, oldest first, and `schedule_days` / `sessions_per_day` mirror the
  newest so an older build still reads the current days. Empty history = a class whose
  days have never changed, which is every class written before this existed.
- `AttendanceStats` — the live numbers (percentage, `canMissMore`, `needToAttend`,
  `isAtRisk`).
- `TermProjection` — the forward look (`remaining`, `mustAttend`, `canSkip`,
  `reachable`, `bestPct`, `worstPct`).
- `SyncQueueItem` — a queued write.
- `LocalRecord` and `Local*` types — the remote row plus Dexie-only fields
  (`synced_at`, `_local_only`).
- `RowByTable` — maps a table name to its row type (used by the sync engine for
  type-safe dispatch).

---

## 5. Data layer

- **`src/lib/supabase.ts`** — the Supabase client, configured with session
  persistence (`storageKey: 'attend_auth'`), token auto-refresh, and a realtime rate
  cap.
- **`src/lib/db.ts`** — the Dexie database `AttendDB` with the four tables
  (`semesters`, `courses`, `sessions`, `sync_queue`) and their indexes. `clearLocalDb()`
  wipes everything on sign-out so a different account never sees cached data.
- **`src/lib/sync.ts`** — **the heart of the app**, the `SyncEngine` singleton:
  - `initialHydrate(userId)` — pulls rows from Supabase into Dexie. First run pulls all
    non-deleted rows; later runs pull only `updated_at > lastSync` deltas (including
    tombstones). After writing each table it dispatches an `attend:sync` event so the
    UI refreshes at once. Has a reentrancy guard so overlapping foreground triggers
    don't stack.
  - `writeLocal(table, op, record)` — optimistic write: put into Dexie, add a
    `sync_queue` row, kick a background flush. Surfaces `attend:quota` if storage is
    full.
  - `flushQueue()` — replays queued writes oldest-first with retry/backoff; refreshes
    the session once on auth errors; stops on network errors; marks rows `synced_at` on
    success. Soft deletes are modelled as upserts carrying `deleted_at`.
  - `subscribeRealtime(userId)` / `handleRealtime(...)` — mirrors remote changes into
    Dexie and dispatches `attend:sync`.
  - Plus per-table `put/bulkPut/update` helpers and error classifiers, and `reset()`
    for sign-out.
- **`src/utils/records.ts`** — `toRemote()` strips the Dexie-only fields before a row
  goes to Supabase.
- **`src/utils/dates.ts`** — date helpers: `toDateKey`/`fromDateKey` (`YYYY-MM-DD`),
  formatting, `WEEK_ORDER` (Mon..Sun), `DAY_LABELS`, `todayKey`, `nowIso`.

---

## 6. State stores — `src/stores`

- **`authStore.ts`** — `session`, `user`, `isLoading`; `setSession`; `signOut` (signs
  out of Supabase, resets the sync engine, clears Dexie). `initAuth()` seeds the store
  from Supabase and subscribes to auth changes.
- **`syncStore.ts`** — `isSyncing`, `pendingCount`, `lastSyncAt`, `isOnline`. The sync
  engine writes here; the `SyncIndicator` reads it.
- **`uiStore.ts`** — persisted `viewFilter` (`'all' | 'other' | <semesterId>`), the
  only piece of UI state that needs to survive reloads.

---

## 7. Domain logic — `src/lib`

- **`calculations.ts`** — the maths, framework-free and unit-testable:
  - `computeAttendanceStats(course, sessions)` — excludes `planned`; percentage from
    present/(present+absent); `canMissMore`; `needToAttend` to recover.
  - `computeTermProjection(course, sessions, termStart, termEnd, today)` — counts future
    classes still to come (recurring schedule plus ad-hoc planned), then best/worst-case
    final percentages and how many you can skip.
  - `generateExpectedDates(course, start, end)` — expands the schedule across a range,
    reading each date against the timetable that was in force on it (guards against
    invalid ranges).
  - `countClassesInTimetable(periods, start, end, excluded)` — the term counted as it
    actually runs; `countClassDays` is the single-timetable wrapper over it.
  - `expectedDatesInRange(course, windowStart, windowEnd)` — the same, clamped to the
    course's own dates; keeps things bounded for open-ended standalone classes.
- **`schedule.ts`** — the **timetable timeline**. A class's days can change partway
  through a term, so "which days does this class meet" is always asked of a date:
  - `schedulePeriods(course)` — the normalized timeline (falling back to the mirror
    for a class that has never changed, and reconciling a mirror edited by an older
    build as a correction of the newest entry).
  - `periodOn` / `scheduleOn` / `indexOfPeriodOn` — the timetable in force on a date.
  - `classesOnWeekdayIn`, `classesOnDateIn`, `timetableHoldsClass` — what a timeline
    holds, by date and slot.
  - `normalizePeriods` — the shape everything else assumes: oldest first, the opening
    entry dateless, one entry per date, nothing that changes nothing, nothing with no
    days. Forgiving, because this data arrives from other devices and older builds.
  - `addScheduleChange`, `editPeriod`, `moveScheduleChange`, `removeScheduleChange`,
    `applyScheduleChange` — the edits the class form makes. The last one is the whole
    difference between a change and a correction: it puts the edited stretch back and
    starts the new days on their own date.
  - `scheduleFields(days, perDay, history)` — **what a save writes**: the normalized
    timeline plus the mirror columns, with an empty history for a class whose days
    have never changed. `saveCourse` goes through it, so the stored shape is always
    the one the readers assume.
  - `scheduleSpans`, `formatSpan`, `formatDays`, `previousDay` / `nextDay` — the
    timeline read back as stretches of dates ("Mon and Wed until 14 Sep").
    `scheduleSpans` sorts but never merges, so a row cannot vanish under the user
    mid-edit and a span's index always points back at the entry it came from.
- **`colors.ts`** — `COURSE_COLORS` (16 muted swatches), `DEFAULT_COURSE_COLOR` (sage),
  `attendanceColor(pct, threshold)` (rose/amber/sage), and `hexToRgba`.
- **`status.ts`** — shared session-status `STATUS_LABEL`, picker `STATUS_OPTIONS`
  (icons + active classes, including "Not yet" = planned), and `TONE_CLASSES` for
  callouts.
- **`changelog.ts`** — the `CHANGELOG` array (newest first) and `APP_VERSION =
  CHANGELOG[0].version`. The single source of truth for the version and the in-app
  "What's new". `major: true` flags feature releases.
- **`export.ts`** — `exportAllDataAsJSON(userId)` and `exportCourseAsCSV(...)`; build a
  blob and trigger a download, fully offline.
- **`motion.ts`** — shared Framer Motion `spring`, `pageVariants`, `listContainer`,
  `listItem`.
- **`queryClient.ts`** — the TanStack Query client (30s `staleTime`, no refetch on
  window focus, since reads are local).

---

## 8. Hooks — `src/hooks`

Each data hook is a thin TanStack Query wrapper over Dexie, plus mutation helpers that
call `syncEngine.writeLocal` and invalidate queries.

- **`useAuth.ts`** — `useAuth()` selector, plus `signInWithEmail` / `signUpWithEmail`
  (which hydrate after auth; new users start with a clean slate, no auto semester).
- **`useCourses.ts`** — `useAllCourses()` (queryKey `['courses']`, loads every
  non-deleted course and filters in memory), `useCourse(id)`, and `useCourseMutations`
  (`saveCourse`, `deleteCourse` which soft-deletes the course and all its sessions).
- **`useSemesters.ts`** — `useSemesters()` and `useSemesterMutations` (`saveSemester`,
  `deleteSemester` which blocks while a class still has recorded attendance).
- **`useSessions.ts`** — `useSessions(courseId)`, `useAllSessions()`,
  `findSessionForDate`, and `useSessionMutations`:
  - `saveSession` / `markSession` (upsert by course+date),
  - `markBreak(courses, start, end)` (bulk-cancels scheduled-but-unrecorded dates in a
    range, leaving anything already recorded alone),
  - `deleteSession`.
- **`useCourseView.ts`** — the **view model**: reads `viewFilter`, returns the filtered
  `courses`, `allCourses`, `semesters`, and `semesterOf(course)`. Resets a stale filter
  if its semester was deleted. Used by Dashboard and Calendar.
- **`useAttendanceStats.ts`** — `useAttendanceStats(course)` and
  `useTermProjection(course, semester)` (derives term bounds from the course, falling
  back to its semester; returns null when there's no end date to project toward).
- **`useRealtime.ts`** — subscribes once per user and turns `attend:sync` window events
  into the right query invalidations.
- **`useNetwork.ts` / `useSyncQueue.ts`** — read-only views of `syncStore`, plus a
  manual `flush()`.
- **`useViewport.ts`** — measures the on-screen keyboard height into the
  `--keyboard-height` CSS variable so bottom sheets lift above the keyboard.

---

## 9. Routing — `src/router.tsx`

A `createHashRouter` (hash routing suits a static PWA). `RootRedirect` sends you to
`/dashboard` or `/auth` based on auth. `ProtectedRoute` guards the app shell. Child
routes: `/dashboard`, `/courses/:id`, `/quick-mark`, `/calendar`, `/settings`. A
`Splash` spinner shows while auth resolves.

---

## 10. Layout — `src/components/layout`

- **`AppShell.tsx`** — the responsive frame: a flex column on phones (content scroller
  + `BottomNav`) and a row at `md+` (`SideNav` + content). Sized by the `html` height
  so the nav sits flush on iOS; only the inner region scrolls; the top safe-area inset
  lives outside the scroller.
- **`SideNav.tsx`** — the sidebar rail shown at `md+` (iPad, landscape).
- **`BottomNav.tsx`** — the phone-portrait tab bar (hidden at `md+`), with the accented
  "Mark" tab.
- **`navItems.ts`** — the shared nav definition (Dashboard, Calendar, Quick Mark,
  Settings) used by both navs.
- **`PageHeader.tsx`** — the title/subtitle/left/right header used on every page.

---

## 11. UI primitives — `src/components/ui`

- **`Button.tsx`** — variants (primary/secondary/ghost/danger), sizes, `fullWidth`,
  tap animation.
- **`Input.tsx`** — labelled input with ring focus and error state, `forwardRef` + `useId`.
- **`Badge.tsx`** — small pill in green/amber/rose/neutral tones.
- **`Modal.tsx`** — centered dialog, portaled to `document.body`, with backdrop.
- **`BottomSheet.tsx`** — the slide-up sheet, portaled to body, lifted above the
  keyboard via `--keyboard-height`. **Only the grip handle drags it** (via
  `useDragControls` + `dragListener={false}`) so the body scrolls freely.
- **`ProgressRing.tsx`** — the animated SVG attendance ring (spring-animated dash
  offset, colour from `attendanceColor`).
- **`Skeleton.tsx`** — loading placeholders, including `CourseCardSkeleton`.
- **`SyncIndicator.tsx`** — the dot in page headers: offline (rose) / pending (amber,
  pulsing) / synced (sage), with a tappable label.
- **`QuotaToast.tsx`** — listens for `attend:quota` and warns when storage is full.
- **`UpdateOverlay.tsx`** — listens for `attend:updating` and shows the "Updating to
  the latest version" screen during a live reload.
- **`Fab.tsx`** — the floating "+" button, pinned above the nav, shared by Dashboard
  and Course detail.

---

## 12. Feature components

- **`courses/CourseCard.tsx`** — a dashboard class card: progress ring + a status badge
  (driven by stats and projection); tap opens detail, long-press opens edit.
- **`courses/CourseForm.tsx`** — the add/edit class sheet: name, colour, schedule days,
  **semester selector** (or standalone), optional dates (validated within the semester
  only when one is chosen), threshold stepper, and delete with an attendance-loss
  warning. Calls `onDeleted` so the detail page can navigate home.
- **`courses/CourseForm.tsx`** (schedule part) — the day toggles edit **one stretch of
  the timeline** at a time, and a class with more than one shows them as a tappable
  list, each with its own start date and an undo.
  For a class with a term behind it (something recorded, or a start date in the past),
  editing the newest stretch raises a question at save time: the timetable moved on a
  date, or it was wrong all along. A hint appears the moment a day is toggled so the
  question is expected rather than sprung.
  Two things in there are worth knowing before editing it: the answer is passed into
  `handleSave` as an argument rather than read from state, because both buttons answer
  and save in the same tick; and validation runs against the timeline **being saved**,
  which is not the one on screen when a change has just been recorded.
- **`courses/ScheduleTimeline.tsx`** — the read-back on a class page: the days it ran
  on, stretch by stretch, with the one running now marked. Renders nothing for a class
  whose days have never changed.
- **`courses/CourseColorPicker.tsx`** — the 16-swatch grid with a haloed selected ring.
- **`courses/ViewFilterBar.tsx`** — the All / each-semester / Other pills, shared by
  Dashboard and Calendar.
- **`courses/DaysOffPicker.tsx`** — the term month by month, where each class day can
  be switched off. Takes the timeline, so it offers the days each date actually held.
- **`sessions/SessionForm.tsx`** — mark/add a single class: date, status (including
  "Not yet" = planned, via `defaultStatus`), notes, delete. Upserts by course+date.
- **`sessions/SessionItem.tsx`** — a row in the course's class list with a status pill.
- **`calendar/MonthCalendar.tsx`** — the month grid; `getDots(dateKey)` returns filled
  dots (marked) and outlined dots (planned/scheduled).
- **`calendar/AttendanceHeatmap.tsx`** — the per-class term heatmap (present filled,
  absent outlined, cancelled crossed, scheduled/planned tinted).
- **`auth/AuthForm.tsx`** — sign-in/sign-up with a tab switcher; on "invalid
  credentials" it offers to create an account rather than showing the raw error.

---

## 13. Pages — `src/pages`

- **`AuthPage.tsx`** — full-screen, centered `AuthForm`.
- **`DashboardPage.tsx`** — uses `useCourseView`; renders the `ViewFilterBar`, the
  "Mark today's classes" banner (counts classes that have a class today and still need
  marking, across the whole app), the course grid, and the `Fab`. Empty state invites
  adding a first class.
- **`CourseDetailPage.tsx`** — the stats strip (ring + totals), the projection or
  threshold callout, the grouped session list, and the heatmap (shown only when a
  start+end window exists). Edit/delete via `CourseForm`; delete navigates home.
- **`QuickMarkPage.tsx`** — the swipeable card deck for today. The deck includes any
  class with a class today (recurring day **or** an ad-hoc session dated today). Opens
  on the first unmarked class; shows "all done" without offering re-marks; only
  auto-returns to the dashboard if you finished the day in this visit.
- **`CalendarPage.tsx`** — the month view filtered by the view model. Planned dots are
  generated only for the visible month (so open-ended classes stay bounded). A day
  sheet lists marked and planned classes and lets you add an extra one. Hosts the
  `BreakSheet` (date range + a checklist of which classes the break applies to).
- **`SettingsPage.tsx`** — account/sign-out; semesters (create/edit/delete); data
  export (JSON + per-class CSV); About with the version; and **What's new** (the
  changelog accordion, latest expanded, major releases badged, long note lists
  condensed behind "Show more").

---

## 14. Backend — `supabase/`

- **`schema.sql`** — the base schema: the three tables, row-level security (every
  policy is `auth.uid() = user_id`), the `updated_at` trigger, the audit-log trigger +
  table, and the realtime publication. A fresh project needs this **and then every
  `migration-*.sql` in order**; the columns added since live in those files, not here.
  See `supabase/README.md`.
- **`migration-002-course-dates.sql`** — `courses.start_date` / `end_date`.
- **`migration-004-optional-semester.sql`** — makes `courses.semester_id` nullable with
  `on delete set null`.
- **`migration-005-planned-status.sql`** — adds `'planned'` to the session status check.
- **`migration-006` … `010`** — days off, the archive columns, double lectures
  (`sessions_per_day`, `sessions.slot`), audit retention, and the sync indexes plus the
  `schema_migrations` registry.
- **`migration-011-schedule-history.sql`** — `courses.schedule_history`, the timetable
  timeline. Defaults to `'[]'`, so every existing class keeps reading from
  `schedule_days` and nothing about it changes.
  (Every migration ends by inserting its own row into `public.schema_migrations`.)

---

## 15. Key flows end to end

- **Sign in.** `AuthForm` → `signInWithEmail` → Supabase auth → `initialHydrate` pulls
  your data into Dexie → router redirects to the dashboard, which reads Dexie.
- **Mark a class (offline-friendly).** Tap in Quick Mark/Calendar → `markSession` →
  `writeLocal` updates Dexie (UI updates instantly) + queues the write → `flushQueue`
  pushes to Supabase when online → `synced_at` set. The `SyncIndicator` reflects
  pending/synced.
- **Cross-device.** Change something on phone → on iPad, opening or foregrounding the
  app runs `initialHydrate` → it writes the delta to Dexie and fires `attend:sync` →
  `useRealtime` invalidates queries → the screen re-reads Dexie and updates at once.
  While both are open, realtime does the same live.
- **Plan ahead, mark later.** Add a class on a future date with status "Not yet"
  (planned). It shows as an outlined dot on the calendar and, when its day arrives,
  appears in Quick Mark and the home banner to be marked.
- **The timetable changes mid-term.** Edit the class, set the new days, and answer the
  question at save time with the date the change started. `CourseForm` splits the
  timeline (`addScheduleChange`), `saveCourse` normalizes it and mirrors the newest
  entry onto `schedule_days`, and every date-based read (`classesOnDate`,
  `generateExpectedDates`, `classesOnDay`, the projection) picks up the right timetable
  on its own, because they all ask `schedulePeriods` about a date. Nothing already
  recorded moves.
- **Break.** Pick a range and which classes it applies to → `markBreak` cancels the
  scheduled-but-unrecorded dates, leaving anything you already marked.
- **Live update.** New deploy → service worker installs → `controllerchange` →
  `UpdateOverlay` → reload into the new version. Confirm via Settings → About.

---

## 16. Conventions worth remembering

- **Reads are always local.** If the UI looks stale after a background change,
  something didn't invalidate a query; the fix lives near `attend:sync` / `useRealtime`.
- **Writes go through `syncEngine.writeLocal`**, never straight to Supabase.
- **Soft deletes only** (`deleted_at`); every read filters them out.
- **A schedule question always carries a date.** Never read `course.schedule_days` to
  decide what a class holds; go through `schedulePeriods` / `classesOnDate`, or the
  answer will be right only for the timetable running now.
- **Versioning** lives in `changelog.ts`; bump by prepending a release. Feature batches
  bump the minor (e.g. next is `0.6.0`); fixes bump the patch.
- **Copy style:** warm and understated, and no em dashes anywhere in UI text.
