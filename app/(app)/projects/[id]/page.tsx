// Project detail — the living record, built to the design spec: header with
// status chip + goal, editable CURRENT STATE with the copper stale strip,
// the teal NEXT ACTION card (linked task when one is set), the WAITING ON /
// BLOCKERS pair, and the project's reorderable task list.

import Link from "next/link";
import { notFound } from "next/navigation";
import AddTask from "@/app/components/AddTask";
import ChiefPageSnapshot from "@/app/components/ChiefPageSnapshot";
import StateCard from "@/app/components/StateCard";
import StatusChip from "@/app/components/StatusChip";
import TaskList from "@/app/components/TaskList";
import { dueLabel } from "@/lib/format";
import { getProject, getProjectState } from "@/lib/projects";
import { getNumericSetting } from "@/lib/settings";
import { listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [state, tasks, agingDays] = await Promise.all([
    getProjectState(id),
    listTasks({ projectId: id }),
    getNumericSetting("waiting.aging_days"),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "done");
  const nextTask =
    (state?.next_task_id && tasks.find((t) => t.id === state.next_task_id)) ||
    null;
  const nextActionText = nextTask ? nextTask.title : state?.next_action ?? null;

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* What Chief sees when opened from this screen. */}
      <ChiefPageSnapshot
        route={`/projects/${project.id}`}
        label={`Project — ${project.name}`}
        state={{
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
            summary: project.summary,
            owner: project.owner,
          },
          state,
          open_tasks: openTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            due_at: t.due_at,
          })),
        }}
      />
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          aria-label="Back to projects"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-hairline"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
            <path
              d="M7 1L1 7l6 6"
              stroke="var(--ink-2)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="text-micro text-ink-3">PROJECT</div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold leading-tight text-ink">
          {project.name}
        </h1>
        <div className="flex items-center gap-2">
          <StatusChip status={project.status} />
          {project.summary && (
            <span className="text-[14px] text-ink-2">{project.summary}</span>
          )}
        </div>
      </div>

      <StateCard
        projectId={project.id}
        currentState={state?.current_state ?? null}
        lastVerifiedAt={state?.last_verified_at ?? null}
        agingDays={agingDays}
      />

      {/* Next action */}
      {nextActionText && (
        <div className="flex flex-col gap-2">
          <div className="text-micro text-ink-3">NEXT ACTION</div>
          <div
            className="box-border flex min-h-[52px] items-center gap-3 rounded-card px-3.5 py-[7px]"
            style={{
              background: "var(--teal-dim)",
              border: "1px solid var(--teal-border)",
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-[16px] font-medium text-ink">
                {nextActionText}
              </div>
              <div className="flex gap-[7px] whitespace-nowrap font-mono text-[11px] text-ink-3">
                {nextTask?.priority && (
                  <span
                    className={
                      nextTask.priority === "P0" || nextTask.priority === "P1"
                        ? "text-copper"
                        : undefined
                    }
                  >
                    {nextTask.priority}
                  </span>
                )}
                {nextTask?.due_at && <span>due {dueLabel(nextTask.due_at)}</span>}
                {nextTask ? (
                  <span className="text-teal">linked task</span>
                ) : (
                  <span>from state record</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waiting on / blockers */}
      <div className="flex gap-2.5">
        <div className="flex flex-1 flex-col gap-1 rounded-card border border-hairline bg-surface px-3.5 py-3">
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-3">
            WAITING ON
          </div>
          <div
            className={`text-[14.5px] leading-snug ${state?.waiting_on ? "text-ink" : "text-ink-3"}`}
          >
            {state?.waiting_on || "None"}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-card border border-hairline bg-surface px-3.5 py-3">
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-3">
            BLOCKERS
          </div>
          <div
            className={`text-[14.5px] leading-snug ${state?.blockers ? "text-ink" : "text-ink-3"}`}
          >
            {state?.blockers || "None"}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-micro text-ink-3">TASKS · {openTasks.length}</div>
          {openTasks.length > 1 && (
            <div className="font-mono text-[10px] text-ink-3">
              HOLD ⋮⋮ TO REORDER
            </div>
          )}
        </div>
        <TaskList
          tasks={openTasks}
          reorderable
          emptyLabel="No open tasks for this project."
        />
        <AddTask projectId={project.id} />
      </div>
    </div>
  );
}
