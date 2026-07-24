// AgentMail read client — a scalable, API-first inbox owned by Chief itself
// (jim-chief@agentmail.to). This MVP is deliberately read-only: it lists and
// fetches messages forwarded to that address so the AgentMail page can render
// them as an inbox. Sending, drafts, and inbound webhooks are out of scope for
// now — the point is to test forwarding before AgentMail replaces the existing
// mail connector.
//
// The API key is read straight from the environment (AGENTMAIL_API_KEY, set by
// the Vercel AgentMail integration); nothing is stored in the database.

const BASE = "https://api.agentmail.to/v0";

/** The agent-owned inbox address. Overridable via env for other deployments. */
export function agentMailInbox(): string {
  return process.env.AGENTMAIL_INBOX?.trim() || "jim-chief@agentmail.to";
}

/** Whether the deployment has an AgentMail API key wired in. */
export function agentMailConfigured(): boolean {
  return Boolean(process.env.AGENTMAIL_API_KEY?.trim());
}

export type AgentMailMessage = {
  messageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  preview: string;
  timestamp: string | null;
  labels: string[];
  attachmentCount: number;
};

export type AgentMailAttachment = {
  attachmentId: string;
  filename: string;
  size: number;
  contentType: string;
};

export type AgentMailMessageDetail = AgentMailMessage & {
  cc: string[];
  text: string;
  html: string;
  attachments: AgentMailAttachment[];
};

// Loose shapes for the documented API responses — we only read the fields the
// inbox view needs and normalize everything defensively.
type RawAttachment = {
  attachment_id?: string;
  filename?: string;
  size?: number;
  content_type?: string;
};

type RawMessage = {
  message_id?: string;
  thread_id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  preview?: string;
  timestamp?: string;
  labels?: string[];
  attachments?: RawAttachment[];
  text?: string;
  html?: string;
};

type ListResponse = { count?: number; messages?: RawMessage[] };

async function amFetch<T>(path: string): Promise<T> {
  const key = process.env.AGENTMAIL_API_KEY?.trim();
  if (!key) throw new Error("AgentMail is not configured.");

  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `AgentMail ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

/** The inbox address encoded as a single path segment (contains @ and .). */
function inboxSegment(): string {
  return encodeURIComponent(agentMailInbox());
}

function normalize(raw: RawMessage): AgentMailMessage {
  return {
    messageId: raw.message_id ?? "",
    threadId: raw.thread_id ?? "",
    from: raw.from ?? "",
    to: raw.to ?? [],
    subject: raw.subject ?? "",
    preview: raw.preview ?? "",
    timestamp: raw.timestamp ?? null,
    labels: raw.labels ?? [],
    attachmentCount: raw.attachments?.length ?? 0,
  };
}

/** Newest-first list of messages currently in the AgentMail inbox. */
export async function listAgentMailMessages(
  limit = 50,
): Promise<AgentMailMessage[]> {
  const data = await amFetch<ListResponse>(
    `/inboxes/${inboxSegment()}/messages?limit=${limit}`,
  );
  return (data.messages ?? []).map(normalize);
}

/** A single message with its full body and attachment metadata. */
export async function getAgentMailMessage(
  messageId: string,
): Promise<AgentMailMessageDetail> {
  const raw = await amFetch<RawMessage>(
    `/inboxes/${inboxSegment()}/messages/${encodeURIComponent(messageId)}`,
  );
  return {
    ...normalize(raw),
    cc: raw.cc ?? [],
    text: raw.text ?? "",
    html: raw.html ?? "",
    attachments: (raw.attachments ?? []).map((a) => ({
      attachmentId: a.attachment_id ?? "",
      filename: a.filename ?? "attachment",
      size: a.size ?? 0,
      contentType: a.content_type ?? "application/octet-stream",
    })),
  };
}
