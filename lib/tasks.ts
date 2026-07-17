// The task list. Ported from Email-wrapper with the tenancy flipped to RLS
// (session client, no explicit tenant key) and the Chief schema changes:
// `status` is the single source of truth (no `done` boolean), `waiting` is a
// first-class status paired with `waiting_on_contact_id` + `waiting_since` so
// Home's Waiting-on strip can cross-reference communications, and `sort`
// carries the user's manual ordering within a project.

import { createClient } from "@/lib/supabase/server";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "waiting"
  | "done";
export type TaskPriority = "P0" | "P1" | "P2" | "P3" | "P4";
export type TaskImpact = "low" | "medium" | "high";
export type TaskEffort = "s" | "m" | "l";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  impact: TaskImpact | null;
  category: string | null;
  delegate_to: string | null;
  effort: TaskEffort | null;
  source: string;
  due_at: string | null;
  project_id: string | null;
  waiting_on_contact_id: string | null;
  waiting_since: string | null;
  sort: number;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, title, notes, status, priority, impact, category, delegate_to, effort, source, due_at, project_id, waiting_on_contact_id, waiting_since, sort, created_at, updated_at";

// Open-and-actionable first; waiting/blocked next; done last.
const STATUS_RANK: Record<TaskStatus, number> = {
  in_progress: 0,
  not_started: 1,
  blocked: 2,
  waiting: 3,
  done: 4,
};

export function isOpen(task: Task): boolean {
  return task.status !== "done";
}

// Pure manual order: `sort` ascending, no status grouping. This is the
// project detail screen's drag order and the source of truth for "what's
// next" — unlike listTasks()'s STATUS_RANK-first ordering (used for the
// cross-project /tasks view), it never lets status bump a task out of the
// position the user dragged it to.
function compareByManualOrder(a: Task, b: Task): number {
  return (
    a.sort - b.sort ||
    (a.priority ?? "P9").localeCompare(b.priority ?? "P9") ||
    b.created_at.localeCompare(a.created_at)
  );
}

export function sortByManualOrder(tasks: Task[]): Task[] {
  return [...tasks].sort(compareByManualOrder);
}

/** The canonical next action: the first open (non-done) task in manual sort
 * order. Reordering rewrites `sort` (see reorderTasks below), so this always
 * reflects the current drag order immediately — it is never a separate
 * ranking computed or cached on read. */
export function firstOpenTask(tasks: Task[]): Task | null {
  const open = sortByManualOrder(tasks.filter(isOpen));
  return open[0] ?? null;
}

export async function listTasks(
  opts: { projectId?: string } = {},
): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select(COLUMNS);
  if (opts.projectId) query = query.eq("project_id", opts.projectId);
  const { data, error } = await query.limit(300);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Task[];
  // In-memory sort keeps the ordering rules explicit: status, then the user's
  // manual sort, then priority (P0 first, nulls last), then newest.
  return rows.sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.sort - b.sort ||
      (a.priority ?? "P9").localeCompare(b.priority ?? "P9") ||
      b.created_at.localeCompare(a.created_at),
  );
}

export async function getTask(id: string): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Task | null) ?? null;
}

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  impact?: TaskImpact | null;
  category?: string | null;
  delegateTo?: string | null;
  effort?: TaskEffort | null;
  source?: string;
  externalId?: string | null;
  dueAt?: string | null;
  projectId?: string | null;
  waitingOnContactId?: string | null;
  sort?: number;
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const supabase = await createClient();
  const status = input.status ?? "not_started";
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      notes: input.notes ?? null,
      status,
      priority: input.priority ?? null,
      impact: input.impact ?? null,
      category: input.category ?? null,
      delegate_to: input.delegateTo ?? null,
      effort: input.effort ?? null,
      source: input.source ?? "manual",
      external_id: input.externalId ?? null,
      due_at: input.dueAt ?? null,
      project_id: input.projectId ?? null,
      waiting_on_contact_id: input.waitingOnContactId ?? null,
      waiting_since: status === "waiting" ? new Date().toISOString() : null,
      sort: input.sort ?? 0,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export type TaskPatch = {
  status?: TaskStatus;
  title?: string;
  notes?: string | null;
  priority?: TaskPriority | null;
  impact?: TaskImpact | null;
  category?: string | null;
  delegateTo?: string | null;
  effort?: TaskEffort | null;
  dueAt?: string | null;
  projectId?: string | null;
  waitingOnContactId?: string | null;
  sort?: number;
};

export async function updateTask(
  id: string,
  patch: TaskPatch,
): Promise<Task | null> {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.impact !== undefined) update.impact = patch.impact;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.delegateTo !== undefined) update.delegate_to = patch.delegateTo;
  if (patch.effort !== undefined) update.effort = patch.effort;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.projectId !== undefined) update.project_id = patch.projectId;
  if (patch.waitingOnContactId !== undefined)
    update.waiting_on_contact_id = patch.waitingOnContactId;
  if (patch.sort !== undefined) update.sort = patch.sort;

  // `waiting_since` tracks when the task entered waiting — the aging dot on
  // Home compares it against the tunable day threshold. Stamp it on the way
  // in, clear it on the way out.
  if (patch.status !== undefined) {
    update.status = patch.status;
    if (patch.status === "waiting") {
      const existing = await getTask(id);
      if (!existing || existing.status !== "waiting") {
        update.waiting_since = new Date().toISOString();
      }
    } else {
      update.waiting_since = null;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Task | null) ?? null;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Persist a manual reorder: assign ascending sort to the given task ids. */
export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("tasks")
      .update({ sort: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}
