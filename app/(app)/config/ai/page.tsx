import ConfigClient from "../ConfigClient";

// Config → AI & Usage: gateway spend, provider/key diagnostics, and software
// updates.
export const dynamic = "force-dynamic";

export default function ConfigAiPage() {
  return <ConfigClient section="ai" />;
}
