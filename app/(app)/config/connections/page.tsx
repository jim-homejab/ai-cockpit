import ConfigClient from "../ConfigClient";

// Config → Connections: email plus Chief Connect / MCP app connections.
export const dynamic = "force-dynamic";

export default function ConfigConnectionsPage() {
  return <ConfigClient section="connections" />;
}
