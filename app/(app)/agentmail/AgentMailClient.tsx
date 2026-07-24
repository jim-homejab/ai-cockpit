"use client";

// The AgentMail inbox — a scrollable list of everything forwarded to Chief's
// own address (jim-chief@agentmail.to), with a tap-to-read detail view. This is
// intentionally read-only for now: no archive/reply/send, just a faithful
// mirror of the AgentMail inbox so forwarding can be validated before it
// replaces the existing mail connector. State comes from /api/agentmail.

import { useCallback, useEffect, useState } from "react";

type AgentMailMessage = {
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

type AgentMailAttachment = {
  attachmentId: string;
  filename: string;
  size: number;
  contentType: string;
};

type AgentMailMessageDetail = AgentMailMessage & {
  cc: string[];
  text: string;
  html: string;
  attachments: AgentMailAttachment[];
};

type ListResponse = {
  configured: boolean;
  inbox?: string;
  messages?: AgentMailMessage[];
  error?: string;
};

function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (m) return m[1].trim();
  return from.split("@")[0] ?? from;
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      .toUpperCase();
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return d
    .toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    })
    .toUpperCase();
}

function fullDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();
}

// Minimal HTML → text fallback for messages that arrive HTML-only.
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|br|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function AgentMailClient() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agentmail");
      const body = (await res.json()) as ListResponse;
      setData(body);
    } catch {
      setData({ configured: true, error: "Couldn't reach AgentMail." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // --- Render states ---------------------------------------------------------

  if (loading && !data) {
    return (
      <div className="pt-6 text-[14px] text-ink-3">Checking AgentMail…</div>
    );
  }

  if (data && !data.configured) {
    return (
      <SetupCard title="AgentMail not configured">
        Set the <span className="text-ink">AGENTMAIL_API_KEY</span> environment
        variable (from the Vercel AgentMail integration), then reload. Chief will
        read the inbox at{" "}
        <span className="text-ink">jim-chief@agentmail.to</span>.
      </SetupCard>
    );
  }

  if (selectedId) {
    return (
      <MessageDetail
        id={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title + inbox address + count/refresh */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-[22px] font-semibold text-ink">AgentMail</h1>
        <button
          aria-label="Refresh"
          onClick={() => void refresh()}
          className="flex h-8 w-8 items-center justify-center rounded-full border text-ink-3"
          style={{ borderColor: "var(--hairline)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 11a8 8 0 1 0-.5 3M20 5v6h-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {data?.inbox && (
        <div
          className="flex items-center justify-between rounded-control border px-3 py-2 font-mono text-[11px] tracking-[0.06em] text-ink-3"
          style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
        >
          <span className="truncate">{data.inbox}</span>
          <span className="shrink-0 pl-3">
            {messages.length} {messages.length === 1 ? "MESSAGE" : "MESSAGES"}
          </span>
        </div>
      )}

      {data?.error && (
        <div
          className="rounded-card border px-3.5 py-3 text-[13.5px]"
          style={{ borderColor: "var(--hairline)", color: "var(--danger)" }}
        >
          {data.error}
        </div>
      )}

      {!data?.error && messages.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-card border px-6 py-16"
          style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
        >
          <div className="chief-voice text-[20px] text-ink">Nothing here yet.</div>
          <div className="text-center text-[14px] leading-snug text-ink-3">
            Forward an email to {data?.inbox ?? "jim-chief@agentmail.to"} and it
            will show up here.
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {messages.map((m) => {
            const name = senderName(m.from);
            return (
              <li key={m.messageId}>
                <button
                  onClick={() => setSelectedId(m.messageId)}
                  className="flex w-full items-start gap-3 rounded-card border p-3.5 text-left"
                  style={{
                    borderColor: "var(--hairline)",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
                    style={{
                      background: "color-mix(in srgb, var(--copper) 16%, transparent)",
                      color: "var(--copper)",
                    }}
                    aria-hidden="true"
                  >
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold text-ink">
                        {name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-3">
                        {shortDate(m.timestamp)}
                      </span>
                    </div>
                    <div className="truncate text-[14px] text-ink-2">
                      {m.subject || "(no subject)"}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-3">
                      {m.preview}
                    </div>
                    {m.attachmentCount > 0 && (
                      <div className="mt-1 font-mono text-[10px] tracking-[0.06em] text-ink-3">
                        📎 {m.attachmentCount}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// --- Detail view ------------------------------------------------------------

function MessageDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [message, setMessage] = useState<AgentMailMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/agentmail/message/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((body: { message?: AgentMailMessageDetail; error?: string }) => {
        if (cancelled) return;
        if (body.message) setMessage(body.message);
        else setError(body.error ?? "Couldn't load this message.");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this message.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const name = message ? senderName(message.from) : "";
  const body = message
    ? message.text || (message.html ? stripHtml(message.html) : "") || message.preview
    : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onBack}
          aria-label="Back to AgentMail"
          className="flex h-8 w-8 items-center justify-center rounded-full border text-ink-2"
          style={{ borderColor: "var(--hairline)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[18px] font-semibold text-ink">AgentMail</h1>
      </div>

      {loading ? (
        <div className="pt-4 text-[14px] text-ink-3">Loading message…</div>
      ) : error ? (
        <div
          className="rounded-card border px-3.5 py-3 text-[13.5px]"
          style={{ borderColor: "var(--hairline)", color: "var(--danger)" }}
        >
          {error}
        </div>
      ) : message ? (
        <div
          className="flex flex-col gap-4 rounded-card border p-[18px] pt-5"
          style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[16px] font-semibold"
              style={{
                background: "color-mix(in srgb, var(--copper) 16%, transparent)",
                color: "var(--copper)",
              }}
              aria-hidden="true"
            >
              {initials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold text-ink">{name}</div>
              <div className="truncate font-mono text-[11px] text-ink-3">
                {message.from}
              </div>
              <div className="font-mono text-[11px] text-ink-3">
                {fullDate(message.timestamp)}
              </div>
            </div>
          </div>

          <div className="text-[18px] font-semibold leading-[1.35] text-ink">
            {message.subject || "(no subject)"}
          </div>

          <div className="h-px" style={{ background: "var(--hairline)" }} />

          <div
            className="whitespace-pre-wrap text-[16px] leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            {body || "(no content)"}
          </div>

          {message.attachments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="font-mono text-[10px] tracking-[0.08em] text-ink-3">
                ATTACHMENTS
              </div>
              {message.attachments.map((a) => (
                <div
                  key={a.attachmentId}
                  className="flex items-center gap-2 rounded-control border px-3 py-2 text-[13px] text-ink-2"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <span aria-hidden="true">📎</span>
                  <span className="truncate">{a.filename}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SetupCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-[22px] font-semibold text-ink">AgentMail</h1>
      <div
        className="flex flex-col rounded-card border p-5"
        style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
      >
        <div className="mb-2 text-[16px] font-semibold text-ink">{title}</div>
        <div className="text-[14.5px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </div>
  );
}
