-- Migration: create agent_execution_logs table
create table if not exists public.agent_execution_logs (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.agent_tasks(id),
  agent_name text,
  status text,
  result jsonb,
  created_at timestamptz default now()
);

grant select, insert on public.agent_execution_logs to authenticated;
