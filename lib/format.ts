// Small date/label helpers for the machine-facts layer (mono metadata).

const DAY_MS = 24 * 60 * 60 * 1000;

/** Compact due label: "today", "tmrw", a near weekday ("Fri"), or "Jul 11". */
export function dueLabel(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((startOfDue.getTime() - startOfToday.getTime()) / DAY_MS);

  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tmrw";
  if (days < 7) return due.toLocaleDateString("en-US", { weekday: "short" });
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isOverdue(dueAt: string | null): boolean {
  return dueLabel(dueAt) === "overdue";
}

/** Whole days since an ISO timestamp (0 = today). */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / DAY_MS));
}
