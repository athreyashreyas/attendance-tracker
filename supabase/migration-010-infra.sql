-- Migration 010: make the database ready to be shared with a college.
--
-- Applied 2026-08-16. Nothing here is visible to anyone using the app. It is
-- about keeping the app quick and the bill at zero as the number of people
-- using it goes up rather than sideways.
--
-- Three parts: indexes the sync engine has always wanted, a record of which
-- migrations have run, and a way to see how close the free tier is to its
-- limits without guessing from the dashboard.

-- ============================================================
-- 1. INDEXES FOR THE QUERY THE APP ACTUALLY MAKES
-- ============================================================
--
-- Every hydration runs, for each of the three tables:
--
--   select * from <table> where user_id = $1 and updated_at > $2
--
-- on opening the app, on focus, and on becoming visible. Until now `sessions`
-- had indexes on `id` and `(course_id, scheduled_date)` and nothing on
-- `user_id`, so each of those was a sequential scan of every session belonging
-- to everybody. At 884 rows that is free. At a college's worth it is a scan of
-- the whole table every time somebody glances at the app, which costs compute
-- on a tier that meters it and makes opening the app slower for everyone as
-- more people join.
--
-- `(user_id, updated_at)` serves both shapes: the first hydration, which has
-- no cursor and reads on the user_id prefix, and every delta after it, which
-- ranges on updated_at within that user.

create index if not exists sessions_user_updated_idx
  on public.sessions (user_id, updated_at);

create index if not exists courses_user_updated_idx
  on public.courses (user_id, updated_at);

create index if not exists semesters_user_updated_idx
  on public.semesters (user_id, updated_at);

-- ============================================================
-- 2. A RECORD OF WHAT HAS BEEN APPLIED
-- ============================================================
--
-- Migrations were loose files applied by hand, with nothing recording which
-- had run. Rebuilding this database meant reading git history and hoping. The
-- table below is the answer to "what state is this project in", and every
-- future migration should end by inserting its own row.

create table if not exists public.schema_migrations (
  version     text        primary key,
  applied_at  timestamptz not null default now(),
  note        text
);

alter table public.schema_migrations enable row level security;
-- No policy on purpose: this is nobody's business but the service role's.

insert into public.schema_migrations (version, note) values
  ('001-schema',            'Base schema: tables, RLS, updated_at and audit triggers'),
  ('002-course-dates',      'courses.start_date / end_date'),
  ('004-optional-semester', 'courses.semester_id nullable, FK on delete set null'),
  ('005-planned-status',    'sessions.status accepts planned'),
  ('006-course-days-off',   'courses.excluded_dates'),
  ('007-archive',           'archived_at + auto_archive on courses and semesters'),
  ('008-double-lectures',   'courses.sessions_per_day, sessions.slot'),
  ('009-audit-retention',   'Audit log writes diffs, nightly prune via pg_cron'),
  ('010-infra',             'Sync indexes, migration tracking, health check')
on conflict (version) do nothing;

-- There is no 003. The gap is historical and harmless.

-- ============================================================
-- 3. SEEING THE CEILING BEFORE REACHING IT
-- ============================================================
--
-- The dashboard reports disk usage, which runs about twice pg_database_size
-- because it counts WAL and provisioning. Comparing that number against the
-- 500 MB allowance and panicking is easy to do; this reports what is actually
-- stored, and what share of it is the app's own data.

create or replace function public.infra_health()
returns table (
  metric text,
  value  text,
  note   text
)
language sql security definer
set search_path = public
as $$
  select 'database total', pg_size_pretty(pg_database_size(current_database())),
         'Dashboard shows roughly double this; it counts WAL and overhead'
  union all
  select 'app data (public)',
         pg_size_pretty(coalesce(sum(pg_total_relation_size(c.oid)), 0)),
         'The only part that grows with users'
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','m','p')
  union all
  select 'signed up', count(*)::text, 'auth.users' from auth.users
  union all
  select 'ever marked a class', count(distinct user_id)::text,
         'Users with at least one session' from public.sessions
  union all
  select 'sessions', count(*)::text, 'The table that grows fastest'
    from public.sessions
  union all
  select 'audit rows', count(*)::text,
         count(*) filter (where old_data is not null or new_data is not null)::text
         || ' still carry payloads'
    from public.attendance_audit_log
  union all
  select 'oldest audit entry', coalesce(min(changed_at)::date::text, 'none'),
         'Pruned past 400 days by the nightly job'
    from public.attendance_audit_log
  union all
  select 'nightly prune',
         coalesce((select status from cron.job_run_details
                    where jobid = (select jobid from cron.job where jobname='prune-audit-log')
                    order by start_time desc limit 1), 'not run yet'),
         coalesce((select start_time::date::text from cron.job_run_details
                    where jobid = (select jobid from cron.job where jobname='prune-audit-log')
                    order by start_time desc limit 1), 'scheduled 03:17 daily');
$$;

revoke all on function public.infra_health() from public, anon, authenticated;
