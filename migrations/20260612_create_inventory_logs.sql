-- Migration: create inventory_logs table
create table if not exists public.inventory_logs (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id),
  user_id uuid,
  change int,
  reason text,
  source text,
  created_at timestamptz default now()
);

grant select, insert on public.inventory_logs to authenticated;
