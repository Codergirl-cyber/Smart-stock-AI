# Agent Ownership Backfill Migrations

This migration package adds ownership metadata to agent-related tables and backfills missing owner references for existing records.

## Included files

- `20260612_add_userid_createdby_to_agent_tables.sql`
  - Forward migration: adds `user_id` and `created_by` fields to `agent_execution_logs` and `created_by` to `agent_tasks`.
- `20260612_backfill_agent_ownership.sql`
  - Forward migration: backfills missing `agent_tasks.user_id` and `agent_execution_logs.user_id` where ownership can be inferred.
- `20260612_rollback_add_userid_createdby_to_agent_tables.sql`
  - Rollback migration for the metadata columns and indexes added by `20260612_add_userid_createdby_to_agent_tables.sql`.
- `20260612_rollback_backfill_agent_ownership.sql`
  - Rollback migration for the ownership backfill, reverting rows marked by this migration.

## Step 1: Backup database

Before applying these migrations, take a full backup of your Supabase/Postgres database.

Example with Supabase CLI:

```bash
supabase db remote set --project-ref <project-ref>
# or use your preferred backup tool / psql dump command
```

Example using `pg_dump`:

```bash
pg_dump --format=custom --file=backup_before_agent_backfill.dump "$DATABASE_URL"
```

## Step 2: Apply migrations

Apply migrations in this order:

1. `20260612_add_userid_createdby_to_agent_tables.sql`
2. `20260612_backfill_agent_ownership.sql`

### Supabase CLI example

```bash
cd /path/to/seller-sync
supabase db remote set --project-ref <project-ref>
supabase db push --schema public
```

If your project is not configured for `supabase db push`, you can also apply the SQL files manually from the Supabase SQL editor or using `psql`:

```bash
psql "$DATABASE_URL" -f migrations/20260612_add_userid_createdby_to_agent_tables.sql
psql "$DATABASE_URL" -f migrations/20260612_backfill_agent_ownership.sql
```

## Step 3: Run validation queries

Verify the backfill and ownership state with these queries.

### Tasks without `user_id`

```sql
SELECT *
FROM public.agent_tasks
WHERE user_id IS NULL
LIMIT 200;
```

### Logs without `user_id`

```sql
SELECT *
FROM public.agent_execution_logs
WHERE user_id IS NULL
LIMIT 200;
```

### Orphaned execution logs

```sql
SELECT el.*
FROM public.agent_execution_logs el
LEFT JOIN public.agent_tasks t ON el.task_id = t.id
WHERE t.id IS NULL
LIMIT 200;
```

### Tasks marked unresolved

```sql
SELECT *
FROM public.agent_tasks
WHERE owner_unresolved IS TRUE
LIMIT 200;
```

### Ownership joins

```sql
SELECT el.*
FROM public.agent_execution_logs el
JOIN public.agent_tasks t ON t.id = el.task_id
WHERE el.user_id <> t.user_id
LIMIT 100;
```

## Step 4: Verify ownership backfill

Expected results after migration:

- `agent_tasks.user_id` is populated for records where ownership could be inferred from `meta` references.
- `agent_execution_logs.user_id` is populated from the owning task when possible.
- Rows still missing `user_id` should be marked with `owner_unresolved = true` for manual review.

## Step 5: Verify RLS policies

After backfill, confirm that ownership enforcement passes for authenticated users.

Example verification queries:

```sql
-- Should return tasks for the current authenticated user only
SELECT *
FROM public.agent_tasks
WHERE user_id = '<YOUR_USER_UUID>'
LIMIT 20;

-- Should return zero rows for another user
SELECT *
FROM public.agent_tasks
WHERE user_id = '<OTHER_USER_UUID>'
LIMIT 20;
```

If you have already applied `20260612_harden_agent_rls.sql`, those policies should now enforce owner-only access for tasks and logs.

## Step 6: Test agent execution

Run a normal agent action in the app and confirm:

- no errors appear
- agent tasks are created with `user_id`
- execution logs are written with `user_id`
- the dashboard and notifications still load for the authenticated user

## Validation Checklist

- [ ] No `agent_tasks` records missing `user_id`
- [ ] No `agent_execution_logs` records missing `user_id`
- [ ] No orphaned `agent_execution_logs` records without a matching `agent_tasks` row
- [ ] Dashboard pages load correctly for authenticated users
- [ ] AI/agent execution completes successfully in the app for the current user

## Risk notes

- `20260612_backfill_agent_ownership.sql` performs best-effort inference and is not fully reversible for rows not marked by the migration.
- `owner_unresolved = true` indicates records that require manual ownership assignment.
- Do not rely on this migration to infer ownership for records with no identifiable `meta` references.
- Always restore from backup before rolling back or making manual owner edits.
- The rollback script only reverts rows that were marked by this migration; it does not restore manually corrected ownership data.
