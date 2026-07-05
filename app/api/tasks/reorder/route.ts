import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { reorderTasks } from "@/lib/tasks";

// Persist a manual ⋮⋮ reorder: body is { ids: [taskId, ...] } in the new order.
export async function POST(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids is required." }, { status: 400 });
  }
  await reorderTasks(ids);
  return NextResponse.json({ ok: true });
}
