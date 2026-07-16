"use client";

import { useCallback, useEffect, useState } from "react";

type Status = { configured: boolean; needsMigration?: boolean };

const inputClass =
  "w-full rounded-control border bg-transparent px-3 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-ink-3";

export default function FrontApiTokenConnection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/front/api-token", { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as {
      status?: Status;
      error?: string;
    };
    if (!response.ok || !body.status) {
      throw new Error(body.error || "Couldn't load Front API setup.");
    }
    setStatus(body.status);
  }, []);

  useEffect(() => {
    void load().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Couldn't load Front API setup."),
    );
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/front/api-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        status?: Status;
        error?: string;
      };
      if (!response.ok || !body.status) {
        throw new Error(body.error || "Couldn't save the Front API token.");
      }
      setStatus(body.status);
      setToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save the Front API token.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/front/api-token", { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Couldn't remove the Front API token.");
      }
      setStatus({ configured: false });
      setToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't remove the Front API token.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-card border p-4"
      style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: status?.configured ? "var(--ok)" : "var(--copper)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-ink">Front API token</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            The reliable path for the Front Inbox. A long-lived Front API token reads
            your tagged conversations directly from Front&apos;s Core API — no OAuth
            expiry, refresh, or namespace limits. Stored only in your own database,
            server-side, and never shown in the browser.
          </p>
        </div>
        <a
          href="https://dev.frontapp.com/docs/create-and-revoke-api-tokens"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[12px] font-semibold text-teal"
        >
          Get a token ↗
        </a>
      </div>

      <div
        className="rounded-control border p-3 text-[12px] leading-relaxed text-ink-3"
        style={{ borderColor: "var(--hairline)" }}
      >
        In Front, go to <strong className="text-ink">Settings → Developers → API
        tokens</strong>, create a token with <strong className="text-ink">Shared
        resources</strong> access, and paste it below. Then set{" "}
        <strong className="text-ink">Config → Front — Chief Inbox Zero tag id</strong>{" "}
        (tag_…) so the Inbox knows which tag to load.
      </div>

      {status?.configured ? (
        <div
          className="flex items-center justify-between rounded-control border p-3"
          style={{ borderColor: "var(--hairline)" }}
        >
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Token saved</div>
            <div className="mt-0.5 text-[12px] text-ink-3">
              The Inbox now reads tags via Front&apos;s Core API.
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="rounded-chip border px-3 py-2 text-[12px] font-semibold text-ink-2 disabled:opacity-50"
            style={{ borderColor: "var(--hairline)" }}
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-3">
            Front API token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the API token (write-only)"
              autoComplete="new-password"
              autoCapitalize="none"
              className={inputClass}
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void save()}
            className="h-11 rounded-control px-4 text-[13.5px] font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--teal)" }}
          >
            {busy ? "Saving…" : "Save API token"}
          </button>
        </>
      )}

      {status?.configured && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus({ configured: false })}
          className="text-[12px] font-semibold text-ink-3 disabled:opacity-40"
        >
          Replace token
        </button>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-control border px-3 py-2.5 text-[12px] leading-relaxed"
          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
