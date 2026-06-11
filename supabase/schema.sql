-- SellerSync — Supabase schema reference
-- Run in Supabase SQL Editor. Adjust types if your project differs.

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  stock integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "products_select_own" on public.products
  for select using (auth.uid() = user_id);

create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = user_id);

create policy "products_update_own" on public.products
  for update using (auth.uid() = user_id);

create policy "products_delete_own" on public.products
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  ig_username text,
  product_name text,
  product_id uuid references public.products (id),
  quantity integer default 1,
  price numeric not null,
  payment_status text default 'unpaid',
  delivery_status text default 'pending',
  order_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders_update_own" on public.orders
  for update using (auth.uid() = user_id);

create policy "orders_delete_own" on public.orders
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id),
  type text not null default 'sale',
  amount numeric not null,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);

create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RPC: create_order_atomic (stock + order + transaction in one transaction)
-- ---------------------------------------------------------------------------
-- Implement in Supabase to match your existing function signature used by the app:
-- create_order_atomic(p_product_id, p_quantity, p_price, p_customer_name,
--   p_payment_status, p_delivery_status, p_ig_username, p_user_id)
