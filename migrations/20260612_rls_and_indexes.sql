-- Add indexes and RLS policies for agent_tasks and inventory_logs

-- Indexes
create index if not exists idx_agent_tasks_status_priority on public.agent_tasks (status, priority);
create index if not exists idx_inventory_logs_product on public.inventory_logs (product_id);

-- RLS policies: simple example allowing authenticated users to insert/select their rows
-- For agent_tasks, keep policies permissive for demo; tighten in production
alter table public.agent_tasks enable row level security;
create policy agent_tasks_authenticated_insert on public.agent_tasks for insert using (true) with check (true);
create policy agent_tasks_authenticated_select on public.agent_tasks for select using (true);

alter table public.inventory_logs enable row level security;
create policy inventory_logs_authenticated_insert on public.inventory_logs for insert using (true) with check (true);
create policy inventory_logs_authenticated_select on public.inventory_logs for select using (true);

-- Rollback: DROP INDEX/ POLICIES statements are provided in separate rollback files
