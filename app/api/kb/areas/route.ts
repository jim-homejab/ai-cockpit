import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { listKbAreas, saveKbAreas } from "@/lib/kb/store";
import { RECOMMENDED_SPINE } from "@/lib/kb/spine";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();
  const areas = await listKbAreas();
  return NextResponse.json({ areas });
}

// PUT { areas: AreaInput[] } replaces the taxonomy; PUT { applySpine: true }
// applies the recommended default structure in one click.
export async function PUT(request: Request) {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const areas = body.applySpine === true ? RECOMMENDED_SPINE : body.areas;
  if (!Array.isArray(areas)) {
    return NextResponse.json({ error: "areas is required." }, { status: 400 });
  }
  const saved = await saveKbAreas(authed.userId, areas);
  return NextResponse.json({ areas: saved });
}
