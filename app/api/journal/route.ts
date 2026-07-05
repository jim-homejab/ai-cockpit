import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { createJournalEntry, listJournal } from "@/lib/journal";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();
  const entries = await listJournal();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  const entry = await createJournalEntry({
    title,
    note: body.note ?? null,
    metadata: body.metadata ?? {},
  });
  return NextResponse.json({ entry }, { status: 201 });
}
