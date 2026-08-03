-- ============================================================
-- Migration 006: per-course days off
-- Run this in the Supabase SQL editor once.
--
-- A class rarely runs on every scheduled weekday between its first and last
-- date: there are holidays, mid-term breaks, and exam weeks. Rather than
-- recording each of those as a cancelled session, they're stored as dates
-- removed from the schedule, so they never become a class at all.
--
-- Existing courses get an empty array and behave exactly as before.
-- ============================================================

alter table public.courses
  add column if not exists excluded_dates date[] default '{}' not null;
