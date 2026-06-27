-- Migration: add product_id column to orders table if missing
-- Run this in the Supabase SQL Editor to fix the "Could not find 'product_id' column" error.

alter table public.orders
  add column if not exists product_id uuid references public.products (id);

alter table public.orders
  add column if not exists product_name text;

alter table public.orders
  add column if not exists quantity integer default 1;

alter table public.orders
  add column if not exists ig_username text;
