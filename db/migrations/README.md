# Migrations

Numbered, append-only SQL files: `NNN_short-description.sql` (three digits, then a
`[\w-]+` slug). Applied in filename order by `node db/migrate.mjs up`, one transaction
per file, recorded in `schema_migrations`. A failed file rolls back, stops the run, and
leaves the ledger untouched.

Rules (docs/DATA-OPS.md §1):

1. **Every schema change lands twice**: as a migration here AND in `docs/SCHEMA.sql`
   (which stays the canonical full schema for fresh databases).
2. **Fresh databases** get the full `docs/SCHEMA.sql`, then
   `node db/migrate.mjs baseline` to mark everything here as already-applied.
3. **Deployed databases (Neon)**: `node db/migrate.mjs up` runs BEFORE the code that
   needs the change deploys — at merge time, not after the 500s start.
4. Never edit or renumber a migration that has reached `main`; write a new one.
