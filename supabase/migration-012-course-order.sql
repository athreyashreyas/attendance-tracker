-- ============================================================
-- Migration 012: classes in the order you put them in
-- Run this in the Supabase SQL editor once, before deploying the app build
-- that writes this column.
--
-- position — where a class sits on the home screen, counting from 0.
--
--   Null means the class has never been arranged, and it reads after the
--   arranged ones in the order it was created. That is the order the app
--   used before this column existed, so every class already in the table
--   keeps the place it has today and nothing appears to move.
--
--   The first arrange hands every class the number it already reads at, and
--   after that only the classes that actually move are written.
-- ============================================================

alter table public.courses
  add column if not exists position int;

insert into public.schema_migrations (version, note) values
  ('012-course-order', 'courses.position: the order classes are shown in')
on conflict (version) do nothing;
