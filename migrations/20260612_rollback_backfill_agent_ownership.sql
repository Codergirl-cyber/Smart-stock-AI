-- Rollback for backfill_agent_ownership
-- Revert changes made by 20260612_backfill_agent_ownership.sql for rows marked as backfilled

-- Clear user_id values that were set by this migration
update public.agent_tasks
set user_id = null,
    backfilled_by_migration = null,
    owner_unresolved = false
where backfilled_by_migration = '20260612_backfill_owner';

update public.agent_execution_logs
set user_id = null,
    backfilled_by_migration = null
where backfilled_by_migration = '20260612_backfill_owner';

-- Drop helper indexes and columns
drop index if exists idx_agent_tasks_backfilled;
drop index if exists idx_agent_execution_logs_backfilled;

alter table if exists public.agent_tasks drop column if exists backfilled_by_migration;
alter table if exists public.agent_tasks drop column if exists owner_unresolved;
alter table if exists public.agent_execution_logs drop column if exists backfilled_by_migration;

