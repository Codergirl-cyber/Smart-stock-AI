-- Migration: Harden RLS for agent_tasks and agent_execution_logs
-- Adds user_id column to agent_tasks, enables RLS, creates policies, and adds indexes.

-- 1) Add user_id column to agent_tasks so tasks are scoped to owners
alter table if exists public.agent_tasks
  add column if not exists user_id uuid;

-- 2) Indexes for performance
create index if not exists idx_agent_tasks_user_id on public.agent_tasks (user_id);
create index if not exists idx_agent_tasks_created_at on public.agent_tasks (created_at);
create index if not exists idx_agent_tasks_status on public.agent_tasks (status);
create index if not exists idx_agent_execution_logs_task_id on public.agent_execution_logs (task_id);
create index if not exists idx_agent_execution_logs_created_at on public.agent_execution_logs (created_at);

-- 3) Enable RLS
alter table public.agent_tasks enable row level security;
alter table public.agent_execution_logs enable row level security;

-- 4) Policies for agent_tasks
-- SELECT: users may select only their own tasks (user_id == auth.uid())
create policy agent_tasks_select_owner on public.agent_tasks for select
  using (user_id = auth.uid());

-- INSERT: users may create tasks only for themselves (user_id must equal auth.uid())
create policy agent_tasks_insert_owner on public.agent_tasks for insert
  with check (user_id = auth.uid());

-- UPDATE: users may update only tasks they own. Prevent modifying tasks owned by others.
create policy agent_tasks_update_owner on public.agent_tasks for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: users may delete only their own tasks and only when task is pending
create policy agent_tasks_delete_owner on public.agent_tasks for delete
  using (user_id = auth.uid() and status = 'pending');

-- Note: The Supabase "service_role" key bypasses RLS entirely for trusted server-side operations.
-- For deployments that pass a role claim in JWTs, you may extend the policies to allow service-role claims.

comment on policy agent_tasks_select_owner on public.agent_tasks is 'Allow owners to SELECT only their tasks (user_id = auth.uid()).';
comment on policy agent_tasks_insert_owner on public.agent_tasks is 'Allow owners to INSERT tasks with user_id equal to auth.uid().';
comment on policy agent_tasks_update_owner on public.agent_tasks is 'Allow owners to UPDATE their own tasks.';
comment on policy agent_tasks_delete_owner on public.agent_tasks is 'Allow owners to DELETE their own pending tasks only.';

-- 5) Policies for agent_execution_logs
-- SELECT: users may view logs only for tasks they own. This joins agent_execution_logs.task_id to agent_tasks.user_id
create policy execution_logs_select_owner on public.agent_execution_logs for select
  using (exists (select 1 from public.agent_tasks t where t.id = public.agent_execution_logs.task_id and t.user_id = auth.uid()));

-- INSERT: disallow regular users from inserting logs. Only service-role/server should insert (service role bypasses RLS).
-- We create a policy that denies inserts for regular authenticated users by making the check false.
create policy execution_logs_insert_service_only on public.agent_execution_logs for insert
  with check (current_setting('request.jwt.claims.role', true) = 'service_role');

comment on policy execution_logs_select_owner on public.agent_execution_logs is 'Allow users to SELECT execution logs only for tasks they own (join to agent_tasks)';
comment on policy execution_logs_insert_service_only on public.agent_execution_logs is 'Disallow regular users from INSERTing logs; intended for service-role inserts only.';

-- UPDATE/DELETE: disallow updates/deletes by non-service actors. No policies for UPDATE/DELETE mean regular users cannot perform them.
-- Optionally add explicit deny policies by creating policies that use false (not necessary but expressive):
create policy execution_logs_update_none on public.agent_execution_logs for update
  using (false);
create policy execution_logs_delete_none on public.agent_execution_logs for delete
  using (false);
comment on policy execution_logs_update_none on public.agent_execution_logs is 'Prevent UPDATE on execution logs via RLS; only service role may update via elevated privileges.';
comment on policy execution_logs_delete_none on public.agent_execution_logs is 'Prevent DELETE on execution logs via RLS; only service role may delete via elevated privileges.';

-- 6) Ensure compatibility with auth.users
-- The policies use auth.uid() which maps to the current JWT subject (user id). Ensure that your client sets the standard auth session with Supabase so auth.uid() is populated.

-- 7) Recommended additional index for task_id on agent_tasks.meta->>'productId' if you query by product often (example):
-- create index if not exists idx_agent_tasks_meta_productid on public.agent_tasks ((meta->>'productId'));

-- 8) Test queries (run as different users / service role to verify behavior):
-- Replace '<USER_UUID>' and '<SERVICE_ROLE_KEY_USAGE>' appropriately when testing.

-- a) As user (with normal JWT): should return only own tasks
-- SELECT * FROM public.agent_tasks WHERE user_id = '<USER_UUID>' LIMIT 5;

-- b) As different user: should return no rows for other's tasks
-- SELECT * FROM public.agent_tasks WHERE user_id = '<OTHER_USER_UUID>' LIMIT 5;

-- c) Attempt to insert a log as normal user: should fail
-- INSERT INTO public.agent_execution_logs (task_id, agent_name, status, result) VALUES ('<TASK_ID>', 'Low Stock Agent', 'completed', '{"msg":"x"}');

-- d) As service role (server): using SUPABASE_SERVICE_ROLE key should be able to query all tasks and insert logs
-- -- Using server-side client with service role key:
-- -- SELECT * FROM public.agent_tasks LIMIT 10;
-- -- INSERT INTO public.agent_execution_logs (task_id, agent_name, status, result) VALUES ('<TASK_ID>', 'Low Stock Agent', 'completed', '{"msg":"x"}');
