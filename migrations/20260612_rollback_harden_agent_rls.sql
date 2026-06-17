-- Rollback for 20260612_harden_agent_rls.sql

-- Drop policies for agent_execution_logs
drop policy if exists execution_logs_update_none on public.agent_execution_logs;
drop policy if exists execution_logs_delete_none on public.agent_execution_logs;
drop policy if exists execution_logs_insert_service_only on public.agent_execution_logs;
drop policy if exists execution_logs_select_owner on public.agent_execution_logs;

drop policy if exists agent_tasks_delete_owner on public.agent_tasks;
drop policy if exists agent_tasks_update_owner on public.agent_tasks;
drop policy if exists agent_tasks_insert_owner on public.agent_tasks;
drop policy if exists agent_tasks_select_owner on public.agent_tasks;

-- Drop indexes
drop index if exists idx_agent_tasks_user_id;
drop index if exists idx_agent_tasks_created_at;
drop index if exists idx_agent_tasks_status;
drop index if exists idx_agent_execution_logs_task_id;
drop index if exists idx_agent_execution_logs_created_at;

-- Optionally remove user_id column
alter table if exists public.agent_tasks drop column if exists user_id;
