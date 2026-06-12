-- Migration: create order_items table
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text,
  quantity int default 1,
  price numeric(12,2) default 0,
  created_at timestamptz default now()
);

grant select, insert on public.order_items to authenticated;
