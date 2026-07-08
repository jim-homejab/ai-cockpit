import ConfigClient from "./ConfigClient";

// Config landing — the Setup concierge/checklist plus links into each
// sub-page (AI & Usage, Connections, Chief, Memory, Account).
export const dynamic = "force-dynamic";

export default function ConfigPage() {
  return <ConfigClient section="home" />;
}
