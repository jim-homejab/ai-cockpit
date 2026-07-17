-- =========================================================
-- Drop project_state.next_action / next_task_id
--
-- A project's next action is no longer an AI-authored field: it's now always
-- computed as the first open (non-done) task in the project's manual sort
-- order (see lib/tasks.ts#firstOpenTask), so these columns are dead weight.
-- =========================================================

drop index if exists public.project_state_next_task_idx;

alter table public.project_state
  drop column if exists next_action,
  drop column if exists next_task_id;
