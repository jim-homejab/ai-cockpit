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

const SETUP_STEPS = [
  {
    title: "Create a Chief project",
    body: "In Pipedream Projects, choose New project and name it Chief. One project will hold every app you connect.",
    action: "Open Pipedream projects",
  },
  {
    title: "Copy the project ID",
    body: "Open the Chief project, choose Connect, and copy the Project ID from Configuration. It begins with proj_.",
    action: "Project → Connect",
  },
  {
    title: "Create an OAuth client",
    body: "Open workspace Settings → API → New OAuth Client. Name it Chief, then copy both values before closing—the secret is shown once.",
    action: "Settings → API",
  },
  {
    title: "Paste and verify",
    body: "Return here, paste the project ID, client ID, and client secret, then keep Development selected for dogfooding.",
    action: "Enter credentials",
  },
] as const;

function SetupIllustration({ step }: { step: number }) {
  const panelStyle = {
    borderColor: "color-mix(in srgb, var(--hairline) 75%, transparent)",
    background: "color-mix(in srgb, var(--surface) 88%, #eef3f6)",
  } as const;
  const selectedStyle = {
    background: "color-mix(in srgb, var(--teal-fill) 16%, var(--surface))",
    color: "var(--teal)",
  } as const;
  const blue = "#138be5";

  return (
    <div
      className="overflow-hidden rounded-control border text-[9px] text-ink-3"
      style={panelStyle}
      aria-hidden="true"
    >
      <div
        className="flex h-7 items-center gap-1.5 border-b px-2"
        style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b65]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#f4c95d]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#65c98a]" />
        <span className="ml-1 font-semibold text-ink-2">Pipedream</span>
      </div>

      {step === 0 && (
        <div className="h-[148px] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink">Projects</span>
            <span
              className="rounded px-2.5 py-1.5 font-semibold text-white"
              style={{ background: blue }}
            >
              + New project
            </span>
          </div>
          <div
            className="mx-auto mt-5 w-[88%] rounded border p-3 shadow-sm"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            <div className="text-[11px] font-semibold text-ink">New Project</div>
            <div className="mt-2 text-ink-3">Name</div>
            <div
              className="mt-1 rounded border px-2 py-1.5 text-[10px] font-medium text-ink"
              style={{ borderColor: blue }}
            >
              Chief
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex h-[148px]">
          <div
            className="w-[31%] border-r p-2"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            {["Resources", "Access", "Connect", "Settings"].map((item) => (
              <div
                key={item}
                className="mb-1 rounded px-1.5 py-1.5"
                style={item === "Connect" ? selectedStyle : undefined}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="flex-1 p-3">
            <div className="text-[11px] font-semibold text-ink">Connect</div>
            <div className="mt-3 rounded border p-2" style={{ borderColor: "var(--hairline)" }}>
              <div className="font-semibold text-ink-2">Configuration</div>
              <div className="mt-2">Project ID</div>
              <div
                className="mt-1 flex items-center justify-between rounded border px-2 py-1.5 font-mono text-ink"
                style={{ borderColor: blue, background: "var(--surface)" }}
              >
                <span>proj_••••••</span>
                <span>⧉</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex h-[148px]">
          <div
            className="w-[34%] border-r p-2"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            <div className="mb-1 font-semibold text-ink-2">Workspace settings</div>
            {["General", "Authentication", "API"].map((item) => (
              <div
                key={item}
                className="mb-1 rounded px-1.5 py-1.5"
                style={item === "API" ? selectedStyle : undefined}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="flex-1 p-3">
            <div className="text-[11px] font-semibold text-ink">Pipedream API</div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink-2">OAuth Clients</div>
                <div className="mt-1">Create API credentials</div>
              </div>
              <span
                className="rounded px-2 py-1.5 font-semibold text-white"
                style={{ background: blue }}
              >
                + New OAuth Client
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="h-[148px] p-3">
          <div
            className="mx-auto w-[92%] rounded border p-3 shadow-sm"
            style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
          >
            <div className="text-[11px] font-semibold text-ink">
              Chief · Pipedream setup
            </div>
            {["Project ID", "Client ID", "Client secret"].map((label) => (
              <div key={label} className="mt-2">
                <div>{label}</div>
                <div
                  className="mt-0.5 h-5 rounded border"
                  style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PipedreamSetupWalkthrough() {
  const [step, setStep] = useState(0);
  const current = SETUP_STEPS[step];

  const advance = () => {
    if (step < SETUP_STEPS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    document.getElementById("pipedream-project-id")?.focus();
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-control border p-3"
      style={{
        borderColor: "var(--teal-border)",
        background: "color-mix(in srgb, var(--teal-fill) 5%, var(--surface))",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.1em] text-teal">
          STEP {step + 1} OF {SETUP_STEPS.length}
        </span>
        <div className="flex gap-1" aria-hidden="true">
          {SETUP_STEPS.map((item, index) => (
            <span
              key={item.title}
              className="h-1.5 rounded-full transition-[width]"
              style={{
                width: index === step ? 18 : 6,
                background: index <= step ? "var(--teal)" : "var(--hairline)",
              }}
            />
          ))}
        </div>
      </div>

      <div aria-live="polite">
        <div className="text-[15px] font-semibold text-ink">{current.title}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{current.body}</p>
      </div>

      <SetupIllustration step={step} />

      <div className="flex items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((value) => value - 1)}
            className="h-9 rounded-control border px-3 text-[12.5px] text-ink-2"
            style={{ borderColor: "var(--hairline)" }}
          >
            Back
          </button>
        )}
        {step === 0 && (
          <a
            href="https://pipedream.com/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 rounded-control border px-3 py-2 text-[12px] font-semibold text-teal"
            style={{ borderColor: "var(--teal-border)" }}
          >
            Open Pipedream ↗
          </a>
        )}
        <button
          type="button"
          onClick={advance}
          className="ml-auto h-9 rounded-control px-3.5 text-[12.5px] font-semibold"
          style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
        >
          {step === SETUP_STEPS.length - 1 ? "Enter credentials ↓" : "Next"}
        </button>
      </div>
    </div>
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

          {!config?.configured && <PipedreamSetupWalkthrough />}

          <label className="flex flex-col gap-1.5 text-[12px] text-ink-3">
            Project ID
            <input
              id="pipedream-project-id"
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
