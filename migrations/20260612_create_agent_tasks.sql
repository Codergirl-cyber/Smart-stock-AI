-- Migration: create agent_tasks table
create table if not exists public.agent_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  agent_name text not null,
  task_type text not null,
  priority text not null,
  status text not null default 'pending',
  description text,
  meta jsonb,
  created_at timestamptz default now()
);

-- Grant minimal rights to authenticated role (adjust to your policies)
grant select, insert, update, delete on public.agent_tasks to authenticated;
