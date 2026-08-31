-- ============================================================
-- Migration 011: a timetable that can change partway through a term
-- Run this in the Supabase SQL editor once, before deploying the app build
-- that writes this column.
--
-- schedule_history — the class's timetable over time, oldest first:
--
--   [{"effective_from": null,         "days": [1,3], "sessions_per_day": {}},
--    {"effective_from": "2026-10-13", "days": [2,4], "sessions_per_day": {}}]
--
--   The first entry carries no date: it covers everything up to the first
--   change, so no date is ever left without a timetable. Each entry after it
--   takes over on its own date.
--
--   An empty array means the class has never changed its days, which is every
--   class that exists today. Those keep reading from schedule_days exactly as
--   before, so this migration changes nothing about them.
--
--   schedule_days / sessions_per_day stay in step with the newest entry. They
--   are what a build of the app that predates this column reads and writes, so
--   an older device still shows the timetable the class is running now.
-- ============================================================

alter table public.courses
  add column if not exists schedule_history jsonb not null default '[]'::jsonb;

insert into public.schema_migrations (version, note) values
  ('011-schedule-history', 'courses.schedule_history: timetables over time')
on conflict (version) do nothing;
