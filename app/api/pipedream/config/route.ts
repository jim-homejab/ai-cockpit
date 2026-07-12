import { getAuthed, unauthorized } from "@/lib/auth";
import {
  getPipedreamConfigStatus,
  publicPipedreamError,
  savePipedreamConfig,
} from "@/lib/pipedream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  try {
    return Response.json({ config: await getPipedreamConfigStatus(authed.userId) });
  } catch (error) {
    console.error("Could not load Pipedream configuration:", error);
    return Response.json(
      { error: publicPipedreamError(error, "Couldn't load Pipedream setup.") },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  try {
    const config = await savePipedreamConfig(
      authed.userId,
      await request.json().catch(() => null),
    );
    return Response.json({ config });
  } catch (error) {
    console.error("Could not save Pipedream configuration:", error);
    return Response.json(
      { error: publicPipedreamError(error, "Couldn't save Pipedream setup.") },
      { status: 400 },
    );
  }
}
