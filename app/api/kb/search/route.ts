import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { searchKb } from "@/lib/kb/search";

export async function POST(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const query = String(body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(body.limit) || 6, 1), 20);
  const hits = await searchKb(query, limit);
  return NextResponse.json({ hits });
}
