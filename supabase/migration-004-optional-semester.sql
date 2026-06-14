-- ============================================================
-- Migration 004 — make a course's semester optional
-- Run this in the Supabase SQL editor once.
--
-- Classes are now the base unit: a course may belong to a semester
-- or stand alone (semester_id null). Switching the foreign key to
-- ON DELETE SET NULL means a deleted semester unlinks its classes
-- instead of cascading them away.
-- ============================================================

alter table public.courses
  alter column semester_id drop not null;

alter table public.courses
  drop constraint if exists courses_semester_id_fkey;

alter table public.courses
  add constraint courses_semester_id_fkey
  foreign key (semester_id) references public.semesters(id) on delete set null;
