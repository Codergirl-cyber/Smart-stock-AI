-- Migration: Add ownership metadata to agent tables
-- Purpose: Ensure agent execution logs and tasks can store explicit user ownership.
-- This migration adds optional user_id and created_by fields for audit and RLS compliance.
alter table if exists public.agent_execution_logs
  add column if not exists user_id uuid;
alter table if exists public.agent_execution_logs
  add column if not exists created_by text;

alter table if exists public.agent_tasks
  add column if not exists created_by text;

-- Indexes
create index if not exists idx_agent_execution_logs_user_id on public.agent_execution_logs (user_id);
create index if not exists idx_agent_tasks_created_by on public.agent_tasks (created_by);

-- Backfill note: existing logs and tasks will have NULL user_id unless backfilled by business logic.
