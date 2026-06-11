-- ============================================================
-- Attend — Supabase schema
-- Run this in the Supabase SQL editor IN ORDER. Do not reorder.
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

create table public.semesters (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  name        text        not null,
  start_date  date        not null,
  end_date    date        not null,
  is_active   boolean     default false not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  deleted_at  timestamptz
);

create table public.courses (
  id                  uuid    default gen_random_uuid() primary key,
  user_id             uuid    references auth.users(id) on delete cascade not null,
  semester_id         uuid    references public.semesters(id) on delete cascade not null,
  name                text    not null,
  color               text    not null default '#4F7942',
  schedule_days       int[]   default '{}' not null,
  min_attendance_pct  int     default 75 not null check (min_attendance_pct between 0 and 100),
  start_date          date,
  end_date            date,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null,
  deleted_at          timestamptz
);

create table public.sessions (
  id              uuid    default gen_random_uuid() primary key,
  course_id       uuid    references public.courses(id) on delete cascade not null,
  user_id         uuid    references auth.users(id) on delete cascade not null,
  scheduled_date  date    not null,
  status          text    not null check (status in ('present', 'absent', 'cancelled')),
  notes           text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  deleted_at      timestamptz
);

create table public.attendance_audit_log (
  id          uuid    default gen_random_uuid() primary key,
  table_name  text    not null,
  record_id   uuid    not null,
  operation   text    not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  changed_at  timestamptz default now() not null,
  user_id     uuid    references auth.users(id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.semesters           enable row level security;
alter table public.courses             enable row level security;
alter table public.sessions            enable row level security;
alter table public.attendance_audit_log enable row level security;

-- Semesters
create policy "own_semesters_select" on public.semesters for select using (auth.uid() = user_id);
create policy "own_semesters_insert" on public.semesters for insert with check (auth.uid() = user_id);
create policy "own_semesters_update" on public.semesters for update using (auth.uid() = user_id);
create policy "own_semesters_delete" on public.semesters for delete using (auth.uid() = user_id);

-- Courses
create policy "own_courses_select" on public.courses for select using (auth.uid() = user_id);
create policy "own_courses_insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "own_courses_update" on public.courses for update using (auth.uid() = user_id);
create policy "own_courses_delete" on public.courses for delete using (auth.uid() = user_id);

-- Sessions
create policy "own_sessions_select" on public.sessions for select using (auth.uid() = user_id);
create policy "own_sessions_insert" on public.sessions for insert with check (auth.uid() = user_id);
create policy "own_sessions_update" on public.sessions for update using (auth.uid() = user_id);
create policy "own_sessions_delete" on public.sessions for delete using (auth.uid() = user_id);

-- Audit log: users read only their own; writes come from triggers (security definer)
create policy "own_audit_select" on public.attendance_audit_log for select using (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_updated_at_semesters
  before update on public.semesters
  for each row execute function public.handle_updated_at();

create trigger trg_updated_at_courses
  before update on public.courses
  for each row execute function public.handle_updated_at();

create trigger trg_updated_at_sessions
  before update on public.sessions
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUDIT LOG TRIGGER
-- ============================================================

create or replace function public.create_audit_log()
returns trigger language plpgsql security definer as $$
declare
  _record_id uuid;
  _user_id   uuid;
  _old       jsonb := null;
  _new       jsonb := null;
begin
  if TG_OP = 'DELETE' then
    _record_id := old.id;
    _user_id   := old.user_id;
    _old       := to_jsonb(old);
  elsif TG_OP = 'UPDATE' then
    _record_id := new.id;
    _user_id   := new.user_id;
    _old       := to_jsonb(old);
    _new       := to_jsonb(new);
  else
    _record_id := new.id;
    _user_id   := new.user_id;
    _new       := to_jsonb(new);
  end if;

  insert into public.attendance_audit_log
    (table_name, record_id, operation, old_data, new_data, user_id)
  values
    (TG_TABLE_NAME, _record_id, TG_OP, _old, _new, _user_id);

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger audit_semesters
  after insert or update or delete on public.semesters
  for each row execute function public.create_audit_log();

create trigger audit_courses
  after insert or update or delete on public.courses
  for each row execute function public.create_audit_log();

create trigger audit_sessions
  after insert or update or delete on public.sessions
  for each row execute function public.create_audit_log();

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.semesters;
alter publication supabase_realtime add table public.courses;
alter publication supabase_realtime add table public.sessions;
