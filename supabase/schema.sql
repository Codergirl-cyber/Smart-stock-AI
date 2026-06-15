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
-- order_items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  quantity integer not null default 1
);

alter table public.order_items enable row level security;

create policy "order_items_insert_own" on public.order_items
  for insert with check (auth.uid() = (select user_id from public.orders where id = order_id));

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

-- Inventory logs table to track IN/OUT movements
create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  change_type text not null check (change_type in ('IN','OUT')),
  quantity integer not null,
  created_at timestamptz default now(),
  user_id uuid references auth.users (id)
);

alter table public.inventory_logs enable row level security;

create policy "inventory_logs_insert_own" on public.inventory_logs
  for insert with check (auth.uid() = user_id);

-- Add product enhancements: reorder_level and category
alter table public.products
  add column if not exists reorder_level integer default 2;

alter table public.products
  add column if not exists category text default '';

-- Atomic create_order function: reduces stock, inserts order, order_items, transaction, and inventory log
create or replace function public.create_order_atomic(
  p_product_id uuid,
  p_quantity integer,
  p_price numeric,
  p_customer_name text,
  p_payment_status text,
  p_delivery_status text,
  p_ig_username text,
  p_user_id uuid
) returns table(order_id uuid) language plpgsql security definer as $$
declare
  v_stock integer;
  v_product_name text;
  v_order_id uuid;
begin
  -- Lock product row
  select stock, name into v_stock, v_product_name from public.products where id = p_product_id for update;
  if v_stock is null then
    raise exception 'product_not_found';
  end if;
  if v_stock < p_quantity then
    raise exception 'insufficient_stock: available=%', v_stock;
  end if;

  -- decrement stock
  update public.products set stock = stock - p_quantity, updated_at = now() where id = p_product_id;

  -- create order
  insert into public.orders(id, user_id, customer_name, product_name, product_id, quantity, price, payment_status, delivery_status, order_date, created_at, updated_at)
  values (gen_random_uuid(), p_user_id, p_customer_name, v_product_name, p_product_id, p_quantity, p_price, p_payment_status, p_delivery_status, current_date, now(), now())
returning public.orders.id into v_order_id;

  -- insert order_items
  insert into public.order_items(id, order_id, product_id, quantity)
  values (gen_random_uuid(), v_order_id, p_product_id, p_quantity);

  -- insert transaction record
  insert into public.transactions(id, order_id, type, amount, status, created_at, updated_at, user_id)
  values (gen_random_uuid(), v_order_id, 'sale', (p_price * p_quantity), 'success', now(), now(), p_user_id);

  -- insert inventory log (OUT)
  insert into public.inventory_logs(id, product_id, change_type, quantity, created_at, user_id)
  values (gen_random_uuid(), p_product_id, 'OUT', p_quantity, now(), p_user_id);

  return query select v_order_id::uuid;
end;
$$;
