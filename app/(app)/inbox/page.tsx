// Inbox — Phase 1 placeholder. One-email-at-a-time triage with Chief's serif
// read arrives with the Gmail MCP integration in Phase 4.
export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="text-micro text-ink-3">INBOX</div>
      <div className="rounded-card border border-hairline bg-surface p-5">
        <p className="chief-voice text-base text-ink-2">
          Nothing to triage yet — Gmail connects in Phase 4.
        </p>
      </div>
    </div>
  );
}
