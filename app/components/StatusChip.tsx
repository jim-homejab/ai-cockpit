// Project status chip — mono caps in a 6px-radius tint. Teal for active
// (Chief-adjacent, reversible energy), quiet for everything else.

import type { ProjectStatus } from "@/lib/projects";

const STYLES: Record<ProjectStatus, { bg: string; color: string }> = {
  active: { bg: "rgba(143,193,183,0.13)", color: "var(--teal)" },
  paused: { bg: "rgba(236,240,236,0.07)", color: "var(--ink-2)" },
  done: { bg: "rgba(140,190,147,0.12)", color: "var(--ok)" },
  archived: { bg: "rgba(236,240,236,0.05)", color: "var(--ink-3)" },
};

export default function StatusChip({ status }: { status: ProjectStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="flex h-[26px] items-center rounded-chip px-[9px] font-mono text-[11px] font-medium tracking-[0.06em]"
      style={{ background: s.bg, color: s.color }}
    >
      {status.toUpperCase()}
    </span>
  );
}
