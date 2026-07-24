import AgentMailClient from "./AgentMailClient";

// AgentMail — a read-only inbox view over Chief's own AgentMail address
// (jim-chief@agentmail.to). Runs side-by-side with the existing Inbox so
// forwarding can be tested before AgentMail replaces the mail connector. All
// live state is fetched client-side from /api/agentmail; the shell is static.
export const dynamic = "force-dynamic";

export default function AgentMailPage() {
  return <AgentMailClient />;
}
