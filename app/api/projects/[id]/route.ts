import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import {
  deleteProject,
  getProject,
  getProjectState,
  updateProject,
} from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const state = await getProjectState(id);
  return NextResponse.json({ project, state });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const project = await updateProject(id, {
    name: body.name,
    status: body.status,
    summary: body.summary,
    owner: body.owner,
    sort: body.sort,
  });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
