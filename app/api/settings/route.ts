import { NextResponse } from "next/server";
import { getAuthed, unauthorized } from "@/lib/auth";
import { getAppSettings, saveAppSettings, SETTING_DEFS } from "@/lib/settings";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();
  const settings = await getAppSettings();
  return NextResponse.json({ settings, defs: SETTING_DEFS });
}

export async function PUT(request: Request) {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  const body = await request.json().catch(() => ({}));
  await saveAppSettings(body.settings ?? {}, authed.userId);
  const settings = await getAppSettings();
  return NextResponse.json({ settings });
}
