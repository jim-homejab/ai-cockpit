// The Home focus view's brain: a DETERMINISTIC ranking computed here, in
// code — Chief writes only the narrative on top; it never re-ranks.
//
// Score (per the build brief): impact weight × inverse effort × due-date
// urgency — with priority folded in as a weight too, since priority is the
// field users actually set. Waiting tasks are EXCLUDED from the ranking
// unless unblocked (their contact has replied since the task entered
// waiting), in which case they come back boosted and flagged. Blocked and
// done tasks never rank.
//
// The same pass produces the Waiting-on strip: every waiting task, cross-
// referenced against the append-only communications log — green = they moved
// (inbound since waiting_since), gray = quiet, copper = quiet past the
// tunable aging threshold (waiting.aging_days).

import { listTasks, type Task } from "@/lib/tasks";
import { listContacts, type Contact } from "@/lib/contacts";
import { hasInboundSince } from "@/lib/communications";
import { getNumericSetting } from "@/lib/settings";
import { daysSince } from "@/lib/format";

const PRIORITY_W: Record<string, number> = {
  P0: 3,
  P1: 2.2,
  P2: 1.6,
  P3: 1.2,
  P4: 1,
};
const IMPACT_W: Record<string, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_W: Record<string, number> = { s: 3, m: 2, l: 1 }; // inverse: small effort ranks up

function urgencyWeight(dueAt: string | null): number {
  if (!dueAt) return 1;
  const due = Date.parse(dueAt);
  if (Number.isNaN(due)) return 1;
  const days = (due - Date.now()) / 86_400_000;
  if (days < 0) return 3; // overdue
  if (days <= 1) return 2.5; // today/tomorrow
  if (days <= 3) return 2;
  if (days <= 7) return 1.5;
  return 1;
}

export type RankedTask = {
  task: Task;
  score: number;
  /** True when this was a waiting task whose contact replied — surfaced with
   *  the green "unblocked" note in the Top-N row. */
  unblocked: boolean;
  /** Compact mono meta, e.g. "high impact / low effort". */
  effortNote: string | null;
};

export type WaitingState = "moved" | "quiet" | "aging";

export type WaitingRow = {
  taskId: string;
  /** Who we're waiting on: the linked contact, else the delegate, else the task. */
  who: string;
  /** What for (the task title). */
  what: string;
  state: WaitingState;
  /** Days since the task entered waiting. */
  days: number;
};

export type FocusSnapshot = {
  top: RankedTask[];
  waiting: WaitingRow[];
  openCount: number;
};

function scoreTask(t: Task, unblocked: boolean): number {
  const p = PRIORITY_W[t.priority ?? ""] ?? 1.4;
  const i = IMPACT_W[t.impact ?? ""] ?? 2;
  const e = EFFORT_W[t.effort ?? ""] ?? 2;
  const u = urgencyWeight(t.due_at);
  const inProgress = t.status === "in_progress" ? 1.15 : 1;
  const unblock = unblocked ? 1.5 : 1;
  return p * i * e * u * inProgress * unblock;
}

const EFFORT_LABEL: Record<string, string> = { s: "low", m: "medium", l: "high" };

function effortNote(t: Task): string | null {
  if (!t.impact && !t.effort) return null;
  const parts: string[] = [];
  if (t.impact) parts.push(`${t.impact} impact`);
  if (t.effort) parts.push(`${EFFORT_LABEL[t.effort]} effort`);
  return parts.join(" / ");
}

/** Compute the whole Home focus picture in one pass. */
export async function buildFocusSnapshot(): Promise<FocusSnapshot> {
  const [tasks, contacts, topCount, agingDays] = await Promise.all([
    listTasks(),
    listContacts().catch(() => [] as Contact[]),
    getNumericSetting("focus.top_count"),
    getNumericSetting("waiting.aging_days"),
  ]);

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const open = tasks.filter((t) => t.status !== "done");

  // Cross-reference every waiting task once (few of them; one indexed query
  // each). "Moved" means an inbound message from the linked contact after the
  // task entered waiting.
  const waiting: WaitingRow[] = [];
  const movedIds = new Set<string>();
  for (const t of open.filter((t) => t.status === "waiting")) {
    const contact = t.waiting_on_contact_id
      ? contactById.get(t.waiting_on_contact_id)
      : undefined;
    const since = t.waiting_since ?? t.updated_at;
    let moved = false;
    if (contact && since) {
      moved = await hasInboundSince(contact.id, since).catch(() => false);
    }
    if (moved) movedIds.add(t.id);
    const days = daysSince(since) ?? 0;
    waiting.push({
      taskId: t.id,
      who: contact?.name ?? t.delegate_to ?? "—",
      what: t.title,
      state: moved ? "moved" : days >= agingDays ? "aging" : "quiet",
      days,
    });
  }
  // Moved first (they need action), then oldest quiet.
  waiting.sort(
    (a, b) =>
      Number(b.state === "moved") - Number(a.state === "moved") ||
      b.days - a.days,
  );

  // Rank: actionable tasks, plus waiting tasks that just unblocked. Blocked
  // tasks and still-waiting tasks stay out.
  const rankable = open.filter(
    (t) =>
      t.status === "not_started" ||
      t.status === "in_progress" ||
      (t.status === "waiting" && movedIds.has(t.id)),
  );
  const ranked: RankedTask[] = rankable
    .map((t) => ({
      task: t,
      unblocked: t.status === "waiting" && movedIds.has(t.id),
      score: scoreTask(t, t.status === "waiting" && movedIds.has(t.id)),
      effortNote: effortNote(t),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.task.priority ?? "P9").localeCompare(b.task.priority ?? "P9") ||
        b.task.created_at.localeCompare(a.task.created_at),
    );

  const top = ranked.slice(0, Math.max(1, topCount || 3));
  return { top, waiting, openCount: open.length };
}
