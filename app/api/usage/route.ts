// GET /api/usage — the AI spend dashboard. In gateway mode, reads the team's
// Vercel AI Gateway credit balance + lifetime spend from /v1/credits (auth is
// the same OIDC token / gateway key Chief already uses). Fails soft to
// { available: false, reason } so the Config panel can explain instead of
// erroring — e.g. direct-Anthropic mode (spend lives in the Anthropic console,
// not here) or no gateway credential.

import { getAuthed, unauthorized } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import {
  AI_GATEWAY_BASE_URL,
  resolveGatewayKey,
  resolveProvider,
} from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAuthed())) return unauthorized();

  let settings;
  try {
    settings = await getAppSettings();
  } catch {
    settings = undefined;
  }

  const provider = await resolveProvider(settings);
  if (provider !== "gateway") {
    return Response.json({ available: false, reason: "not-gateway" });
  }

  const key = await resolveGatewayKey(settings);
  if (!key) return Response.json({ available: false, reason: "no-credential" });

  try {
    const res = await fetch(`${AI_GATEWAY_BASE_URL}/v1/credits`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json({ available: false, reason: `http-${res.status}` });
    }
    const data = (await res.json()) as {
      balance?: string | number;
      total_used?: string | number;
    };
    return Response.json({
      available: true,
      balance: data.balance ?? null,
      totalUsed: data.total_used ?? null,
    });
  } catch {
    return Response.json({ available: false, reason: "error" });
  }
}
