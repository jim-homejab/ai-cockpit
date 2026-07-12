import { getAuthed, unauthorized } from "@/lib/auth";
import { publicPipedreamError, searchPipedreamApps } from "@/lib/pipedream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return Response.json({ apps: await searchPipedreamApps(authed.userId, query) });
  } catch (error) {
    console.error("Could not search Pipedream apps:", error);
    return Response.json(
      { error: publicPipedreamError(error, "Couldn't search Pipedream apps.") },
      { status: 502 },
    );
  }
}
