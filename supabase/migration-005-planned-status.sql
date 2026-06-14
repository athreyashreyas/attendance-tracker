-- ============================================================
-- Migration 005 — allow a "planned" session status
-- Run this in the Supabase SQL editor once.
--
-- A planned session is a class placed on the calendar but not yet
-- marked, so the user can add an ad-hoc class ahead of time and
-- record present/absent/cancelled on the day itself.
-- ============================================================

alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('present', 'absent', 'cancelled', 'planned'));
