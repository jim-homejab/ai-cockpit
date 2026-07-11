"use client";

import { useChief } from "./ChiefProvider";

export default function ProjectChiefAction({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const { runIntent } = useChief();
  return (
    <button
      type="button"
      onClick={() =>
        void runIntent({
          id: "project.plan_next_steps",
          projectId,
          projectName,
        })
      }
      className="ml-auto flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold text-ink"
      style={{ borderColor: "var(--teal-border)", background: "var(--surface)" }}
      aria-label={`Plan next steps for ${projectName} with Chief`}
    >
      <span className="font-serif text-[15px] italic text-teal">C</span>
      Plan next steps
    </button>
  );
}
