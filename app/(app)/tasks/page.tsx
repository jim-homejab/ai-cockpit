// Tasks — the full list. Open work first (status-ranked), recently completed
// below. Rows follow the design's task-row vocabulary; adding is direct, and
// everything else (ranking narrative, proposals) arrives with later phases.

import AddTask from "@/app/components/AddTask";
import TaskList from "@/app/components/TaskList";
import { listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await listTasks();
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done").slice(0, 10);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center justify-between">
        <div className="text-micro text-ink-3">TASKS · {open.length}</div>
      </div>

      <AddTask />

      <TaskList tasks={open} emptyLabel="No open tasks. Enjoy it." />

      {done.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="text-micro text-ink-3">DONE</div>
          <TaskList tasks={done} />
        </div>
      )}
    </div>
  );
}
