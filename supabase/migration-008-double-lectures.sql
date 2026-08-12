-- ============================================================
-- Migration 008: more than one class a day
-- Run this in the Supabase SQL editor once, before deploying the app build
-- that writes these columns.
--
-- sessions_per_day — for the weekdays a class meets more than once, how many
--                    times it meets: {"2": 2} = two classes every Tuesday.
--                    Weekdays left out hold exactly one class, so every
--                    existing course keeps its current schedule.
-- slot             — which class of the day a session records, counting from 1.
--                    Every existing session is the first (and only) class of
--                    its day, which is what the default gives them.
-- ============================================================

alter table public.courses
  add column if not exists sessions_per_day jsonb not null default '{}'::jsonb;

alter table public.sessions
  add column if not exists slot int not null default 1 check (slot >= 1);

-- Sessions are looked up by course and date on every mark, and now by slot
-- within the day as well.
create index if not exists sessions_course_date_idx
  on public.sessions (course_id, scheduled_date);
