"use client";

import { useCallback, useEffect, useState } from "react";

type Config = {
  configured: boolean;
  projectId: string | null;
  environment: "development" | "production" | null;
};

type App = {
  slug: string;
  name: string;
  description: string | null;
};

type Connection = {
  id: string;
  accountId: string;
  appSlug: string;
  appName: string;
  accountName: string | null;
  healthy: boolean;
  serverName: string;
};

type Draft = {
  projectId: string;
  clientId: string;
  clientSecret: string;
  environment: "development" | "production";
};

const emptyDraft = (): Draft => ({
  projectId: "",
  clientId: "",
  clientSecret: "",
  environment: "development",
});

const inputClass =
  "w-full rounded-control border bg-transparent px-3 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-ink-3";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="h-[7px] w-[7px] shrink-0 rounded-full"
      style={{ background: ok ? "var(--ok)" : "var(--copper)" }}
      aria-hidden="true"
    />
  );
}

export default function PipedreamConnections() {
  const [config, setConfig] = useState<Config | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    const response = await fetch("/api/pipedream/connections");
    const body = (await response.json().catch(() => ({}))) as {
      connections?: Connection[];
      error?: string;
    };
    if (!response.ok) throw new Error(body.error ?? "Couldn't load connections.");
    setConnections(body.connections ?? []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pipedream/config");
      const body = (await response.json().catch(() => ({}))) as {
        config?: Config;
        error?: string;
      };
      if (!response.ok || !body.config) {
        throw new Error(body.error ?? "Couldn't load Pipedream setup.");
      }
      setConfig(body.config);
      if (body.config.configured) {
        await loadConnections();
      } else {
        setDraft(emptyDraft());
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load Pipedream setup.");
    } finally {
      setLoading(false);
    }
  }, [loadConnections]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConfig = async () => {
    if (!draft || busy) return;
    setBusy("setup");
    setError(null);
    try {
      const response = await fetch("/api/pipedream/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = (await response.json().catch(() => ({}))) as {
        config?: Config;
        error?: string;
      };
      if (!response.ok || !body.config) {
        throw new Error(body.error ?? "Couldn't verify Pipedream setup.");
      }
      setConfig(body.config);
      setDraft(null);
      await loadConnections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't verify Pipedream setup.");
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/pipedream/apps?q=${encodeURIComponent(q)}`);
      const body = (await response.json().catch(() => ({}))) as {
        apps?: App[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Couldn't search apps.");
      setApps(body.apps ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't search apps.");
    } finally {
      setSearching(false);
    }
  };

  const connect = async (app: string) => {
    if (busy) return;
    setBusy(`connect:${app}`);
    setError(null);
    try {
      const response = await fetch("/api/pipedream/connect-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appSlug: app }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Couldn't start authorization.");
      }
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't start authorization.");
      setBusy(null);
    }
  };

  const disconnect = async (connection: Connection) => {
    if (
      busy ||
      !window.confirm(
        `Disconnect ${connection.accountName ?? connection.appName} from Chief and Pipedream?`,
      )
    ) {
      return;
    }
    setBusy(`disconnect:${connection.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/pipedream/connections/${connection.id}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Couldn't disconnect account.");
      setConnections((current) => current.filter((item) => item.id !== connection.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't disconnect account.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-card border p-4 text-[13px] text-ink-3"
        style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
      >
        Loading Pipedream…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div
          className="rounded-control border px-3 py-2 text-[12.5px]"
          style={{
            borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)",
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      {(!config?.configured || draft) && (
        <div
          className="flex flex-col gap-4 rounded-card border p-4"
          style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
        >
          <div className="flex flex-col gap-1">
            <div className="text-[17px] font-semibold text-ink">
              {config?.configured ? "Update Pipedream setup" : "Connect your Pipedream account"}
            </div>
            <p className="text-[13px] leading-relaxed text-ink-2">
              One Pipedream project unlocks hosted sign-in for every app Chief can use.
            </p>
          </div>

          <ol className="flex flex-col gap-3">
            {[
              <>
                Create or sign in to your{" "}
                <a
                  href="https://pipedream.com/auth/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal underline"
                >
                  Pipedream account
                </a>
                .
              </>,
              <>Create a Connect project and open its OAuth client credentials.</>,
              <>Paste the four values below. Chief verifies them before saving.</>,
            ].map((step, index) => (
              <li key={index} className="flex gap-3 text-[13px] leading-relaxed text-ink-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]"
                  style={{ background: "var(--raised)" }}
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <a
            href="https://pipedream.com/docs/connect/mcp/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-[12.5px] font-semibold text-teal"
          >
            Open Pipedream setup guide →
          </a>

          <label className="flex flex-col gap-1.5 text-[12px] text-ink-3">
            Project ID
            <input
              value={draft?.projectId ?? ""}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, projectId: event.target.value } : current,
                )
              }
              placeholder="proj_…"
              autoCapitalize="none"
              autoComplete="off"
              className={inputClass}
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-3">
            Client ID
            <input
              type="password"
              value={draft?.clientId ?? ""}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, clientId: event.target.value } : current,
                )
              }
              placeholder={config?.configured ? "Enter to replace saved credentials" : "OAuth client ID"}
              autoComplete="new-password"
              className={inputClass}
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-3">
            Client secret
            <input
              type="password"
              value={draft?.clientSecret ?? ""}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, clientSecret: event.target.value } : current,
                )
              }
              placeholder={config?.configured ? "Enter to replace saved credentials" : "OAuth client secret"}
              autoComplete="new-password"
              className={inputClass}
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-ink-3">
            Environment
            <select
              value={draft?.environment ?? "development"}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        environment:
                          event.target.value === "production" ? "production" : "development",
                      }
                    : current,
                )
              }
              className={inputClass}
              style={{ borderColor: "var(--hairline)" }}
            >
              <option value="development">Development</option>
              <option value="production">Production</option>
            </select>
          </label>
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            Client credentials are encrypted in Supabase Vault. They are never returned
            to this browser or included in Chief&apos;s model context.
          </p>
          <div className="flex gap-2">
            {config?.configured && (
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="h-11 flex-1 rounded-control border text-[14px] text-ink-2"
                style={{ borderColor: "var(--hairline)" }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={busy === "setup"}
              className="h-11 flex-1 rounded-control text-[14px] font-semibold disabled:opacity-50"
              style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
            >
              {busy === "setup" ? "Verifying…" : "Verify & continue"}
            </button>
          </div>
        </div>
      )}

      {config?.configured && !draft && (
        <>
          <div
            className="flex items-center gap-3 rounded-card border p-4"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            <StatusDot ok />
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] text-ink">Pipedream ready</div>
              <div className="truncate font-mono text-[10.5px] text-ink-3">
                {config.projectId} · {config.environment?.toUpperCase()} · CREDENTIALS SAVED
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...emptyDraft(),
                  projectId: config.projectId ?? "",
                  environment: config.environment ?? "development",
                })
              }
              className="font-mono text-[10.5px] tracking-[0.05em] text-teal"
            >
              EDIT
            </button>
          </div>

          <div
            className="flex flex-col gap-3 rounded-card border p-4"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            <div>
              <div className="text-[16px] font-semibold text-ink">Connect an app</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                Search Pipedream, then authorize the account in its hosted secure flow.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void search()}
                placeholder="Search Gmail, Notion, Slack…"
                className={inputClass}
                style={{ borderColor: "var(--hairline)" }}
              />
              <button
                type="button"
                onClick={() => void search()}
                disabled={!query.trim() || searching}
                className="h-[42px] rounded-control px-3.5 text-[13.5px] font-semibold disabled:opacity-40"
                style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
              >
                {searching ? "…" : "Search"}
              </button>
            </div>
            {apps.map((app) => (
              <div key={app.slug} className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-[13px] font-semibold text-ink-2"
                  style={{ background: "var(--raised)" }}
                >
                  {app.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] text-ink">{app.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {app.description ?? app.slug}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void connect(app.slug)}
                  disabled={Boolean(busy)}
                  className="shrink-0 rounded-control border px-3 py-2 text-[12.5px] font-semibold text-teal disabled:opacity-50"
                  style={{ borderColor: "var(--teal-border)" }}
                >
                  {busy === `connect:${app.slug}` ? "Opening…" : "Connect"}
                </button>
              </div>
            ))}
            {!searching && query.trim() && apps.length === 0 && (
              <div className="text-[12.5px] text-ink-3">
                Search to find apps with MCP tools.
              </div>
            )}
          </div>

          <div
            className="flex flex-col gap-3 rounded-card border p-4"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            <div>
              <div className="text-[16px] font-semibold text-ink">Connected apps</div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                Verified reads run automatically. Writes, sends, deletes, and unknown
                tools always ask first.
              </p>
            </div>
            {connections.length === 0 && (
              <div className="text-[13px] text-ink-3">No Pipedream apps connected yet.</div>
            )}
            {connections.map((connection) => (
              <div key={connection.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <StatusDot ok={connection.healthy} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] text-ink">
                      {connection.appName}
                    </div>
                    <div className="truncate font-mono text-[10.5px] text-ink-3">
                      {connection.accountName ?? connection.accountId} ·{" "}
                      {connection.healthy ? "CONNECTED" : "NEEDS RECONNECT"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void connect(connection.appSlug)}
                    disabled={Boolean(busy)}
                    className="font-mono text-[10.5px] tracking-[0.05em] text-teal disabled:opacity-50"
                  >
                    RECONNECT
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnect(connection)}
                    disabled={Boolean(busy)}
                    className="font-mono text-[10.5px] tracking-[0.05em] text-ink-3 disabled:opacity-50"
                  >
                    {busy === `disconnect:${connection.id}` ? "REMOVING…" : "REMOVE"}
                  </button>
                </div>
                <div className="h-px" style={{ background: "var(--hairline)" }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
