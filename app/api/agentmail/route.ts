// GET /api/agentmail — the AgentMail inbox: a newest-first list of messages
// forwarded to Chief's own address (jim-chief@agentmail.to), read live from the
// AgentMail API. Read-only for now; the page renders these as an inbox so
// forwarding can be tested alongside the existing mail connector.

import { getAuthed, unauthorized } from "@/lib/auth";
import {
  agentMailConfigured,
  agentMailInbox,
  listAgentMailMessages,
} from "@/lib/agentmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  if (!(await getAuthed())) return unauthorized();

  if (!agentMailConfigured()) {
    return Response.json({ configured: false });
  }

  try {
    const messages = await listAgentMailMessages(50);
    return Response.json({
      configured: true,
      inbox: agentMailInbox(),
      messages,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "AgentMail fetch failed.";
    return Response.json(
      { configured: true, inbox: agentMailInbox(), error },
      { status: 502 },
    );
  }
}
