-- Migration: Add user_id indexes for performance optimization
create index if not exists idx_products_user_id on public.products (user_id);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_transactions_user_id on public.transactions (user_id);
