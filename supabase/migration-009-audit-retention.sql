-- Migration 009: stop the audit log outgrowing the data it describes.
--
-- Applied 2026-08-16.
--
-- The log stored a whole JSON copy of a row on every change, and on an UPDATE
-- it stored two, the row before and the row after. By August it was 904 kB of
-- a 1.29 MB public schema: 70% of everything the app stored, at 706 bytes a
-- row, growing on every edit rather than every class, and nothing ever removed
-- a single row of it. Left alone it would have been the thing that filled the
-- database, long before attendance did.
--
-- Three changes, in order of how much they save:
--
--   1. Write less in the first place. An INSERT no longer copies the new row,
--      because that row is sitting in the table it was just inserted into. An
--      UPDATE keeps only the fields that actually moved. A DELETE still keeps
--      the whole row, since that is the one case where the data is genuinely
--      gone, and the case an audit log exists for.
--
--   2. Thin what is already there, and keep thinning. Past RECENT_DAYS an
--      entry loses its payload and keeps its shape: who changed what, when,
--      and how. Past KEEP_DAYS it goes.
--
--   3. Run that on a schedule instead of remembering to.
--
-- The bias is deliberately toward recent history, because that is what anyone
-- actually asks about. A mark that changed last week is a real question. The
-- exact prior value of a row from last spring is not.
--
-- Nothing in the app reads this table. It is a safety net for answering "why
-- did my attendance change", so metadata alone still answers the question of
-- whether something was touched and by whom.

-- ============================================================
-- 1. WRITE LESS
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
    -- About to vanish, so this is the only copy there will ever be.
    _old       := to_jsonb(old);

  elsif TG_OP = 'UPDATE' then
    _record_id := new.id;
    _user_id   := new.user_id;

    -- Only the columns that actually moved. Storing the unchanged ones twice
    -- was most of the weight, and none of the information.
    _new := (
      select jsonb_object_agg(n.key, n.value)
      from jsonb_each(to_jsonb(new)) n
      left join jsonb_each(to_jsonb(old)) o on o.key = n.key
      where o.value is distinct from n.value
    );
    _old := (
      select jsonb_object_agg(o.key, o.value)
      from jsonb_each(to_jsonb(old)) o
      left join jsonb_each(to_jsonb(new)) n on n.key = o.key
      where n.value is distinct from o.value
    );

    -- updated_at moves on every single write and means nothing by itself.
    _new := _new - 'updated_at';
    _old := _old - 'updated_at';

    -- A write that changed nothing of substance is not worth a row. The sync
    -- engine replays writes, so this case is common rather than theoretical.
    if _new is null or _new = '{}'::jsonb then
      return new;
    end if;

  else
    _record_id := new.id;
    _user_id   := new.user_id;
    -- No copy on purpose: the inserted row is in the table, one join away.
  end if;

  insert into public.attendance_audit_log
    (table_name, record_id, operation, old_data, new_data, user_id)
  values
    (TG_TABLE_NAME, _record_id, TG_OP, _old, _new, _user_id);

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- ============================================================
-- 2. THIN WHAT IS ALREADY THERE
-- ============================================================

-- Pruning scans by age, so give it something better than the whole table.
create index if not exists idx_audit_changed_at
  on public.attendance_audit_log (changed_at);

/**
 * Drops the payloads from entries past their detail window, and removes
 * entries past their keep window entirely. Safe to run as often as you like:
 * it only ever touches rows it has not already dealt with.
 */
create or replace function public.prune_audit_log(
  recent_days int default 60,
  keep_days   int default 400
)
returns table (thinned bigint, removed bigint)
language plpgsql security definer
set search_path = public
as $$
declare
  _thinned bigint;
  _removed bigint;
begin
  update public.attendance_audit_log
     set old_data = null,
         new_data = null
   where changed_at < now() - make_interval(days => recent_days)
     and (old_data is not null or new_data is not null);
  get diagnostics _thinned = row_count;

  delete from public.attendance_audit_log
   where changed_at < now() - make_interval(days => keep_days);
  get diagnostics _removed = row_count;

  return query select _thinned, _removed;
end;
$$;

-- Nobody signed in should be calling this.
revoke all on function public.prune_audit_log(int, int) from public, anon, authenticated;

-- ============================================================
-- 3. ONE-OFF: APPLY THE NEW POLICY TO WHAT IS ALREADY STORED
-- ============================================================
--
-- Age-based pruning barely touches this table today, because nearly all of it
-- is recent: 702 of 1,311 rows arrived in a single week as users joined. The
-- weight is not old entries, it is redundant ones, so the rewrite below is by
-- shape rather than by date. It is the same policy the trigger now follows,
-- applied backwards over the rows written before it existed.

-- An inserted row is in its table. The copy never earned its space.
update public.attendance_audit_log
   set new_data = null
 where operation = 'INSERT'
   and new_data is not null;

-- Reduce both sides of an update to the fields that actually differ.
update public.attendance_audit_log a
   set new_data = (
         select jsonb_object_agg(n.key, n.value)
         from jsonb_each(a.new_data) n
         left join jsonb_each(a.old_data) o on o.key = n.key
         where o.value is distinct from n.value
           and n.key <> 'updated_at'
       ),
       old_data = (
         select jsonb_object_agg(o.key, o.value)
         from jsonb_each(a.old_data) o
         left join jsonb_each(a.new_data) n on n.key = o.key
         where n.value is distinct from o.value
           and o.key <> 'updated_at'
       )
 where a.operation = 'UPDATE'
   and a.old_data is not null
   and a.new_data is not null;

-- An update whose only change was updated_at now carries nothing at all.
delete from public.attendance_audit_log
 where operation = 'UPDATE'
   and new_data is null
   and old_data is null;

-- ============================================================
-- 4. ON A SCHEDULE
-- ============================================================

create extension if not exists pg_cron;

-- Replace rather than duplicate, so re-running this migration is harmless.
select cron.unschedule('prune-audit-log')
where exists (select 1 from cron.job where jobname = 'prune-audit-log');

select cron.schedule(
  'prune-audit-log',
  '17 3 * * *', -- daily, off the hour, when nobody is marking attendance
  $$select public.prune_audit_log();$$
);
