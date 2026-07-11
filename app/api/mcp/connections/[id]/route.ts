import { getAuthed, unauthorized } from "@/lib/auth";
import {
  deleteMcpConnection,
  updateMcpConnection,
} from "@/lib/mcp-connections";
import { parseMcpConnectionInput } from "@/lib/mcp-connection-input";
import { invalidateMcpToolCache } from "@/lib/mcp-broker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const authed = await getAuthed();
  if (!authed) return unauthorized();
  const { id } = await params;

  try {
    const input = await parseMcpConnectionInput(
      await req.json().catch(() => null),
      { allowExistingBearerSecret: true },
    );
    const connection = await updateMcpConnection(authed.userId, id, input);
    invalidateMcpToolCache();
    return Response.json({ connection });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't update connection.";
    const duplicate = /duplicate key|unique constraint/i.test(message);
    const missing = /not found/i.test(message);
    return Response.json(
      {
        error: duplicate
          ? "A connection with that name already exists."
          : message,
      },
      { status: duplicate ? 409 : missing ? 404 : 400 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getAuthed())) return unauthorized();
  const { id } = await params;
  try {
    await deleteMcpConnection(id);
    invalidateMcpToolCache();
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't remove connection.";
    return Response.json({ error: message }, { status: 400 });
  }
}

