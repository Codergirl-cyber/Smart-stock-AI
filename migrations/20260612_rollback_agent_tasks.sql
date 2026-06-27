-- Rollback for agent_tasks and related artifacts
drop index if exists idx_agent_tasks_status_priority;
drop policy if exists agent_tasks_authenticated_insert on public.agent_tasks;
drop policy if exists agent_tasks_authenticated_select on public.agent_tasks;
drop table if exists public.agent_tasks;
