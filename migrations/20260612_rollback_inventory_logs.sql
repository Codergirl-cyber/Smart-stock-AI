-- Rollback for inventory_logs and related artifacts
drop index if exists idx_inventory_logs_product;
drop policy if exists inventory_logs_authenticated_insert on public.inventory_logs;
drop policy if exists inventory_logs_authenticated_select on public.inventory_logs;
drop table if exists public.inventory_logs;
