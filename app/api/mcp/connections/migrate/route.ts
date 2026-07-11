import { getAuthed, unauthorized } from "@/lib/auth";
import {
  createMcpConnection,
  listMcpConnections,
} from "@/lib/mcp-connections";
import { parseMcpServers } from "@/lib/mcp";
import { parseMcpConnectionInput } from "@/lib/mcp-connection-input";
import { getSetting, saveAppSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const authed = await getAuthed();
  if (!authed) return unauthorized();

  const raw = await getSetting("mcp.servers");
  const legacy = parseMcpServers(raw);
  if (legacy.length === 0) {
    return Response.json({ ok: true, imported: 0 });
  }

  const existing = await listMcpConnections();
  const names = new Set(existing.map((connection) => connection.name.toLowerCase()));
  let imported = 0;

  try {
    for (const server of legacy) {
      if (names.has(server.name.toLowerCase())) continue;
      const input = await parseMcpConnectionInput({
        name: server.name,
        url: server.url,
        authType: server.authorization_token ? "bearer" : "none",
        authorizationToken: server.authorization_token,
        app: server.app,
        allowedTools: server.allowedTools,
        // Preserve the legacy behavior; new connections default to ask.
        trustReadAnnotations: true,
      });
      await createMcpConnection(authed.userId, input);
      names.add(server.name.toLowerCase());
      imported++;
    }

    // The plaintext legacy blob is removed only after every entry is safely
    // represented in the Vault-backed store.
    await saveAppSettings({ "mcp.servers": "" }, authed.userId);
    return Response.json({ ok: true, imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Legacy migration failed.";
    return Response.json({ ok: false, imported, error: message }, { status: 400 });
  }
}

