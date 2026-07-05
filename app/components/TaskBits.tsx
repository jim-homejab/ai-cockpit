// Small shared pieces of the task-row vocabulary (design spec 1b/1c):
// the 20px checkbox (teal-filled when done) and the mono priority tag
// (P0/P1 copper — attention; the rest stay quiet).

import type { TaskPriority } from "@/lib/tasks";

export function TaskCheckbox({
  done,
  onToggle,
  disabled,
}: {
  done: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={done ? "Mark not done" : "Mark done"}
      onClick={onToggle}
      disabled={disabled}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-chip"
      style={
        done
          ? { background: "var(--teal-fill)" }
          : { border: "1.5px solid var(--ink-3)" }
      }
    >
      {done && (
        <svg width="10" height="8" viewBox="0 0 11 9" fill="none" aria-hidden="true">
          <path
            d="M1 4.5L4 7.5 10 1"
            stroke="var(--teal-on-fill)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function PriorityTag({ priority }: { priority: TaskPriority | null }) {
  if (!priority) return null;
  const hot = priority === "P0" || priority === "P1";
  return (
    <span className={`font-mono text-[11px] ${hot ? "text-copper" : "text-ink-2"}`}>
      {priority}
    </span>
  );
}
