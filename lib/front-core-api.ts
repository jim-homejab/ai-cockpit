// Front Core REST (`api2.frontapp.com`) using the official MCP OAuth grant.
// Tagged Inbox inventory needs GET /tags/{id}/conversations — Front's MCP
// search_conversations wraps Search and under-counts no-inbox discussions.

import { getFrontAccessToken } from "@/lib/front-auth";
import { FRONT_API_BASE } from "@/lib/front-search-helpers";

export async function frontCoreGet(pathWithQuery: string): Promise<unknown> {
  const token = await getFrontAccessToken();
  if (!token) {
    throw new Error(
      "Connect Front official MCP in Settings → Connections first.",
    );
  }
  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  const response = await fetch(`${FRONT_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 240);
    throw new Error(
      `Front Core API ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
    );
  }
  return response.json();
}
