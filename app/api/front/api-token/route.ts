import { getAuthed, unauthorized } from "@/lib/auth";
import {
  deleteFrontApiToken,
  getFrontApiStatus,
  publicFrontApiError,
  saveFrontApiToken,
} from "@/lib/front-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();
  try {
    return Response.json({ status: await getFrontApiStatus() });
  } catch (error) {
    return Response.json(
      { error: publicFrontApiError(error, "Couldn't load Front API setup.") },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await getAuthed())) return unauthorized();
  try {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    const status = await saveFrontApiToken(body?.token);
    return Response.json({ status });
  } catch (error) {
    return Response.json(
      { error: publicFrontApiError(error, "Couldn't save the Front API token.") },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  if (!(await getAuthed())) return unauthorized();
  try {
    await deleteFrontApiToken();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: publicFrontApiError(error, "Couldn't remove the Front API token.") },
      { status: 500 },
    );
  }
}
