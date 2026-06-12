-- Migration: Backfill agent_tasks.user_id and agent_execution_logs.user_id where possible
-- Marks rows backfilled by setting backfilled_by_migration = '20260612_backfill_owner'

alter table if exists public.agent_tasks
  add column if not exists backfilled_by_migration text;

alter table if exists public.agent_tasks
  add column if not exists owner_unresolved boolean default false;

alter table if exists public.agent_execution_logs
  add column if not exists backfilled_by_migration text;

-- 1) Try to set agent_tasks.user_id from products referenced in meta->>'productId'
update public.agent_tasks t
set user_id = p.user_id,
    backfilled_by_migration = '20260612_backfill_owner'
from public.products p
where t.user_id is null
  and (t.meta->>'productId') is not null
  and (t.meta->>'productId') = p.id;

-- 2) Try to set from orders referenced in meta->>'orderId'
update public.agent_tasks t
set user_id = o.user_id,
    backfilled_by_migration = '20260612_backfill_owner'
from public.orders o
where t.user_id is null
  and (t.meta->>'orderId') is not null
  and (t.meta->>'orderId') = o.id;

-- 3) Try to set from transactions referenced in meta->>'transactionId'
update public.agent_tasks t
set user_id = tr.user_id,
    backfilled_by_migration = '20260612_backfill_owner'
from public.transactions tr
where t.user_id is null
  and (t.meta->>'transactionId') is not null
  and (t.meta->>'transactionId') = tr.id;

-- 4) Mark unresolved remaining tasks
update public.agent_tasks
set owner_unresolved = true
where user_id is null;

-- 5) Backfill agent_execution_logs.user_id from task ownership where possible
update public.agent_execution_logs el
set user_id = t.user_id,
    backfilled_by_migration = '20260612_backfill_owner'
from public.agent_tasks t
where el.user_id is null
  and el.task_id = t.id
  and t.user_id is not null;

-- Indexes to speed up verification queries
create index if not exists idx_agent_tasks_backfilled on public.agent_tasks (backfilled_by_migration);
create index if not exists idx_agent_execution_logs_backfilled on public.agent_execution_logs (backfilled_by_migration);

-- Note: This migration only attempts best-effort mapping using common references in meta. Manual review required for rows marked owner_unresolved = true.
