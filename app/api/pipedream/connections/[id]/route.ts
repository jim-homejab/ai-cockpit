import { getAuthed, unauthorized } from "@/lib/auth";
import {
  disconnectPipedreamAccount,
  publicPipedreamError,
} from "@/lib/pipedream";
import { invalidateMcpToolCache } from "@/lib/mcp-broker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  const { id } = await params;
  try {
    await disconnectPipedreamAccount(authed.userId, id);
    invalidateMcpToolCache();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Could not disconnect Pipedream account:", error);
    return Response.json(
      { error: publicPipedreamError(error, "Couldn't disconnect that account.") },
      { status: 400 },
    );
  }
}
