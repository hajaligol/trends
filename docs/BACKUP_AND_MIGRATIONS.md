# Database backup and migration strategy

Phase 14's "database backup/migration strategy documentation" deliverable
(`CLAUDE_BUILD_INSTRUCTIONS.txt` Phase 14 task list).

## Migrations

Schema changes are managed with **Drizzle Kit**, config in
`drizzle.config.ts`, SQL migration files in `drizzle/migrations/`
(currently `0000` through `0007`, one per schema-changing phase — 3, 6, 7,
8, 9, 10, 11, 12).

- **Generate** a new migration after editing `src/lib/db/schema/*.ts`:
  ```bash
  npm run db:generate
  ```
  This diffs the TypeScript schema against `drizzle/migrations/meta`'s
  snapshot and writes a new numbered `.sql` file. Review the generated SQL
  before committing — Drizzle Kit is good but not infallible about intent
  (e.g. a column rename can generate as a drop+add unless named explicitly
  as a rename).
- **Apply** pending migrations:
  ```bash
  npm run db:migrate
  ```
  Idempotent — already-applied migrations (tracked in Drizzle's own
  migrations table in the target database) are skipped. Safe to run
  repeatedly, including as a deploy step (see `docs/DEPLOYMENT.md`).
- **Inspect** the database directly:
  ```bash
  npm run db:studio
  ```

### Migration discipline

- Migration files, once merged, are treated as immutable history — fix
  forward with a new migration, never edit an already-applied file. Every
  migration in `drizzle/migrations/` today follows this.
- Every table has foreign keys and the constraints the domain needs
  (unique constraints for SKUs, coupon codes, etc.) — enforced at the
  database level, not just in application code (rule "Never rely only on
  application code to enforce uniqueness").
- A fresh clone can always go from zero to a fully migrated, seeded
  database with:
  ```bash
  npm run db:migrate
  npm run db:seed
  ```
  This exact sequence is what Phase 14's own verification re-ran to
  confirm the schema is still self-consistent (see `PROGRESS.md`).

### Rolling back a migration

Drizzle Kit does not generate automatic "down" migrations. To roll back a
bad migration in production:
1. Write a new forward migration that reverses the change (preferred —
   keeps history linear and matches the "fix forward" discipline above), or
2. Restore from a backup taken before the migration was applied (see
   below) if the change is destructive and irreversible in SQL (e.g. a
   dropped column whose data is gone).

This is why the backup cadence below matters most **immediately before**
running a migration in production, not just on a fixed schedule.

## Backups

**No automated backup job is wired into this codebase or any specific
hosting provider** — none is fixed yet (see `docs/DEPLOYMENT.md`). This
section documents the strategy and the manual commands so whoever picks a
provider can wire the equivalent managed feature (most managed Postgres
providers — RDS, Neon, Supabase, etc. — offer automated snapshots that
satisfy this strategy directly; use those in preference to a hand-rolled
cron job wherever available).

### What to back up

The PostgreSQL database is the only stateful, non-recoverable data store in
this architecture. There is no object storage/CDN in use yet (product
media currently lives in `public/`, which is part of the deployed
application artifact, not separately mutable state — see
`docs/DEPLOYMENT.md`'s "What is explicitly NOT set up yet"). Once object
storage is introduced, it becomes a second thing needing its own backup
policy.

### Recommended cadence

- **Continuous or hourly** automated snapshots/WAL archiving via the
  hosting provider's managed backup feature, once one is chosen — this is
  standard for any provider handling real orders/payments and should not
  be treated as optional given this store processes real money once a
  real payment gateway is configured.
- **Always, immediately before** running a migration against production
  (`npm run db:migrate`) — a manual snapshot taken right before, even if
  automated backups already exist, gives a known-good restore point with
  zero ambiguity about "was this backup before or after the migration."
- **Before any manual data intervention** (an admin support/`db:studio`
  session doing a one-off data fix).

### Manual backup/restore commands

Using `pg_dump`/`pg_restore` (works against any PostgreSQL target,
including this project's own local dev database):

```bash
# Backup (custom format — compressed, supports selective/parallel restore)
pg_dump --format=custom --file=trends-backup-$(date +%Y%m%d-%H%M%S).dump "$DATABASE_URL"

# Restore into a fresh/empty database
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" trends-backup-<timestamp>.dump
```

For a quick plain-SQL backup (larger, human-readable, simpler to inspect):

```bash
pg_dump --format=plain --file=trends-backup-$(date +%Y%m%d-%H%M%S).sql "$DATABASE_URL"
```

### Restore drill

A backup that has never been restored is not a verified backup. Whatever
provider/cadence is ultimately chosen, periodically restore the most
recent backup into a scratch database and run:

```bash
DATABASE_URL="postgresql://.../trends_restore_test" npm run test:integration
```

A clean pass confirms the restored database is structurally sound and the
schema/data are mutually consistent — not just that `pg_restore` exited
`0`.

## What this does NOT cover yet

- Point-in-time recovery (PITR) configuration — depends entirely on the
  chosen managed Postgres provider's own feature, not something this
  application configures itself.
- Cross-region backup replication — an operational/provider decision, not
  an application-level one.
- Backup encryption-at-rest policy — inherit whatever the chosen storage
  target for backup files provides; do not store unencrypted `pg_dump`
  output (which contains customer PII — addresses, mobile numbers, order
  history) somewhere without at-rest encryption.
