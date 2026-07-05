import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { createKbDocument, listKbDocuments, type KbKind } from "@/lib/kb/store";
import { findRelatedKbEntries } from "@/lib/kb/related";

export async function GET(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const kind = (new URL(request.url).searchParams.get("kind") ?? "fact") as KbKind;
  const documents = await listKbDocuments(kind === "instruction" ? "instruction" : "fact");
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title || !text) {
    return NextResponse.json(
      { error: "Title and body are required." },
      { status: 400 },
    );
  }

  // Surface near-duplicates so callers can offer a merge instead of a near-copy.
  const related = await findRelatedKbEntries({ title, body: text });

  const document = await createKbDocument({
    title,
    body: text,
    source: body.source ?? "manual",
    tags: Array.isArray(body.tags) ? body.tags : [],
    kind: body.kind === "instruction" ? "instruction" : "fact",
    area: body.area ?? null,
    topic: body.topic ?? null,
  });
  return NextResponse.json({ document, related }, { status: 201 });
}
