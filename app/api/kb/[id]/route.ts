import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import {
  deleteKbDocument,
  getKbDocument,
  updateKbDocument,
} from "@/lib/kb/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  const document = await getKbDocument(id);
  if (!document) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const document = await updateKbDocument(id, {
    title: body.title,
    body: body.body,
    tags: body.tags,
    kind: body.kind,
    area: body.area,
    topic: body.topic,
  });
  if (!document) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ document });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  await deleteKbDocument(id);
  return NextResponse.json({ ok: true });
}
