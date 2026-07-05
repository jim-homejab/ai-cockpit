import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { createContact, listContacts } from "@/lib/contacts";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();
  const contacts = await listContacts();
  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const contact = await createContact({
    name,
    emails: Array.isArray(body.emails) ? body.emails : [],
    company: body.company ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ contact }, { status: 201 });
}
