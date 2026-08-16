# Database

`schema.sql` is the base schema. Everything since is a numbered migration
applied on top of it, in order. A fresh project needs `schema.sql` and then
every `migration-*.sql` in sequence. There is no migration 003; the gap is
harmless.

`functions/` holds edge functions, each with its own README.

## What has been applied

`public.schema_migrations` is the answer, rather than git history:

```sql
select version, applied_at, note from public.schema_migrations order by version;
```

**Every new migration must end by inserting its own row there.** Before 010
nothing recorded what had run, and rebuilding the database meant reading
commits and hoping.

`schema.sql` is kept in step with production rather than frozen at its original
state, so reading it alone is never misleading. Migration 009 rewrote the audit
trigger, and `schema.sql` carries that rewritten version; re-applying 009 over
it is harmless, since it is a `create or replace`.

## Checking on it

```sql
select * from public.infra_health();
```

Reports what is stored, how much of it is the app's own data, how many people
have signed up against how many have actually marked a class, and whether the
nightly prune ran. Worth a look when the dashboard's number moves, because the
dashboard reports disk usage, which runs about twice `pg_database_size` and
invites a fright that is not warranted.

## Keeping storage honest

Attend runs on a 500 MB free tier with no backups, and it is local-first, so
Postgres is the backup rather than the working copy. That makes stored bytes
worth thinking about before they are written, not after.

The lesson came from the audit log. It stored a full JSON copy of every row on
every change, and two copies on an update. By August 2026 it was 904 kB of a
1.29 MB schema: 70% of everything the app had ever stored, describing 842
sessions that themselves took 248 kB. It grew on every edit rather than every
class, and nothing removed any of it. Migration 009 cut it to 272 kB without
losing anything you would actually want.

Three rules, learned the hard way:

**Do not store what you can derive.** An INSERT audit entry copied the new row
while that row sat in the table it was inserted into. The copy only matters if
the row is later hard-deleted, and the DELETE entry captures that anyway. Those
redundant copies were 948 of 1,311 rows.

**Store the difference, not both sides.** An update wrote every column twice,
changed or not. Almost all of that was the same value repeated. Diffing brought
a typical update entry from ~706 bytes to a couple of hundred.

**Give anything that only grows a way to shrink.** Log and history tables need
a retention policy on the day they are created, not once they are the largest
thing in the database. `prune_audit_log()` runs nightly under `pg_cron`: it
strips payloads after 60 days and deletes entries after 400, which keeps a full
academic year of "who changed what and when" for disputes while letting the
detail go.

Before adding a table that grows per user action, ask what removes rows from it
and what it stores that could be looked up instead. If the answer to the first
is "nothing", it will eventually be the biggest table here.

## Handy queries

Where the space actually is (`pg_catalog` will dominate and is fixed overhead;
`public` is the only part you control):

```sql
select n.nspname as schema,
       pg_size_pretty(sum(pg_total_relation_size(c.oid))) as size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','m','p')
group by 1
order by sum(pg_total_relation_size(c.oid)) desc;
```

Your own tables, with row counts:

```sql
select relname as tbl,
       n_live_tup as rows,
       pg_size_pretty(pg_total_relation_size(relid)) as size
from pg_stat_user_tables
where schemaname = 'public'
order by pg_total_relation_size(relid) desc;
```

Note that the dashboard's figure is disk usage and runs roughly twice
`pg_database_size`, because it counts WAL and provisioning overhead. Compare
like with like before concluding anything is wrong.
