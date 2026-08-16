# Database

`schema.sql` is the original schema. Everything since is a numbered migration
applied on top of it, in order. A fresh project needs `schema.sql` and then
every `migration-*.sql` in sequence. There is no migration 003; the gap is
harmless.

`functions/` holds edge functions, each with its own README.

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
