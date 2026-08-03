-- ============================================================
-- Migration 007: archiving classes and semesters
-- Run this in the Supabase SQL editor once.
--
-- archived_at  — set when the record is archived, null while it's live.
-- auto_archive — whether the app may archive it on its own once its last date
--                has passed. Cleared when the user pulls something back out of
--                the archive, so their choice isn't undone on the next launch.
--
-- Existing rows stay live until their end date passes, at which point the app
-- archives them on its own.
-- ============================================================

alter table public.courses
  add column if not exists archived_at  timestamptz,
  add column if not exists auto_archive boolean not null default true;

alter table public.semesters
  add column if not exists archived_at  timestamptz,
  add column if not exists auto_archive boolean not null default true;

create index if not exists courses_archived_idx   on public.courses (user_id, archived_at);
create index if not exists semesters_archived_idx on public.semesters (user_id, archived_at);
