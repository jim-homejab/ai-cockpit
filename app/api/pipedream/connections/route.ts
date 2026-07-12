import { getAuthed, unauthorized } from "@/lib/auth";
import {
  publicPipedreamError,
  syncPipedreamConnections,
} from "@/lib/pipedream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  try {
    return Response.json({
      connections: await syncPipedreamConnections(authed.userId),
    });
  } catch (error) {
    console.error("Could not sync Pipedream connections:", error);
    return Response.json(
      { error: publicPipedreamError(error, "Couldn't load Pipedream connections.") },
      { status: 502 },
    );
  }
}
