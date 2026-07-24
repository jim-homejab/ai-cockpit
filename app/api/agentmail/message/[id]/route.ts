// GET /api/agentmail/message/[id] — a single AgentMail message with its full
// body and attachment metadata, for the reading view on the AgentMail page.

import { getAuthed, unauthorized } from "@/lib/auth";
import { agentMailConfigured, getAgentMailMessage } from "@/lib/agentmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAuthed())) return unauthorized();

  if (!agentMailConfigured()) {
    return Response.json(
      { error: "AgentMail is not configured." },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const message = await getAgentMailMessage(id);
    return Response.json({ message });
  } catch (e) {
    const error = e instanceof Error ? e.message : "AgentMail fetch failed.";
    return Response.json({ error }, { status: 502 });
  }
}
