import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { deleteTask, updateTask } from "@/lib/tasks";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const task = await updateTask(id, {
    title: body.title,
    notes: body.notes,
    status: body.status,
    priority: body.priority,
    impact: body.impact,
    category: body.category,
    delegateTo: body.delegateTo,
    effort: body.effort,
    dueAt: body.dueAt,
    projectId: body.projectId,
    waitingOnContactId: body.waitingOnContactId,
    sort: body.sort,
  });
  if (!task) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
