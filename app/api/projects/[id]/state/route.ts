import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { getProject, upsertProjectState } from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

// Replace-per-field upsert of the project's single current-state record.
// last_verified_at is stamped on every write.
export async function PUT(request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const state = await upsertProjectState(
    id,
    {
      current_state: body.current_state,
      next_action: body.next_action,
      next_task_id: body.next_task_id,
      open_loops: body.open_loops,
      blockers: body.blockers,
      waiting_on: body.waiting_on,
      decisions: body.decisions,
      recent_changes: body.recent_changes,
      confidence: body.confidence,
    },
    new Date().toISOString(),
  );
  return NextResponse.json({ state });
}
