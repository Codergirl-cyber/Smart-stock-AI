-- Migration: add reorder_level and category to products
alter table if exists public.products
  add column if not exists reorder_level int default 2,
  add column if not exists category text;

grant select, update on public.products to authenticated;
