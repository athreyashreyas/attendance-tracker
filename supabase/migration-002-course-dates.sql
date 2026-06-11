-- ============================================================
-- Migration 002: per-course schedule dates
-- Run this in the Supabase SQL editor once.
-- Adds an optional start/end date to each course so the class schedule and the
-- "classes remaining" projection can use the course's own dates instead of the
-- whole semester. Existing courses keep NULL and fall back to the semester.
-- ============================================================

alter table public.courses add column if not exists start_date date;
alter table public.courses add column if not exists end_date date;
