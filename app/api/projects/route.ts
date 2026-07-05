import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { createProject, listProjectsWithState } from "@/lib/projects";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();
  const projects = await listProjectsWithState();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const project = await createProject({
    name,
    status: body.status,
    summary: body.summary ?? null,
    owner: body.owner ?? null,
  });
  return NextResponse.json({ project }, { status: 201 });
}
