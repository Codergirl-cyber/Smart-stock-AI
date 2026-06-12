-- Rollback for add_userid_createdby_to_agent_tables
-- Purpose: Remove ownership metadata columns and associated indexes from agent tables.
alter table if exists public.agent_execution_logs drop column if exists user_id;
alter table if exists public.agent_execution_logs drop column if exists created_by;
alter table if exists public.agent_tasks drop column if exists created_by;
drop index if exists idx_agent_execution_logs_user_id;
drop index if exists idx_agent_tasks_created_by;
