// GET /api/config/status — the setup/diagnostics snapshot: which credentials
// the deployment has, what's connected, and how populated the workspace is.
// Powers the Config page's Connections + Diagnostics sections and the
// onboarding checklist (and gives the concierge its ground truth). Booleans
// only for env — never the values.

import { getAuthed, unauthorized } from "@/lib/auth";
import { getFrontOAuthStatus } from "@/lib/front-auth";
import { googleOauthConfigured, getGoogleConnection } from "@/lib/google-auth";
import { getMailAccount } from "@/lib/mail";
import { listProjects } from "@/lib/projects";
import { listTasks } from "@/lib/tasks";
import { listKbDocuments, listInstructions } from "@/lib/kb/store";
import { listContacts } from "@/lib/contacts";
import { getUpdatesInfo } from "@/lib/updater-workflow";
import { resolveAi, resolveProvider, checkModelHealth } from "@/lib/ai";
import { getAppSettings } from "@/lib/settings";
import { getPipedreamConfigStatus } from "@/lib/pipedream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await getAuthed();
  if (!authed) return unauthorized();

  // Loaded once so the AI readiness probe and the model-health preflight below
  // share the same settings (a pasted gateway key must reach both).
  const settings = await getAppSettings().catch(() => undefined);

  const [
    mail,
    google,
    projects,
    tasks,
    kb,
    instructions,
    contacts,
    ai,
    provider,
    front,
    pipedream,
  ] =
    await Promise.all([
      getMailAccount().catch(() => null),
      getGoogleConnection().catch(() => null),
      listProjects().catch(() => []),
      listTasks().catch(() => []),
      listKbDocuments().catch(() => []),
      listInstructions().catch(() => []),
      listContacts().catch(() => []),
      // AI readiness is provider-aware: gateway (OIDC/key) OR a direct
      // Anthropic key both count. resolveAi returns null when neither exists.
      resolveAi({ settings }).catch(() => null),
      resolveProvider(settings).catch(() => "gateway" as const),
      getFrontOAuthStatus().catch(() => ({
        configured: false,
        connected: false,
        clientId: null,
        scopes: [],
      })),
      getPipedreamConfigStatus(authed.userId).catch(() => ({
        configured: false,
        projectId: null,
        environment: null,
      })),
    ]);

  const email = (await authed.supabase.auth.getUser()).data.user?.email ?? null;

  // Preflight: verify the model ids Chief will actually use exist in the
  // gateway catalog, so a bogus/deprecated id (the kimi-k2.7 class of bug)
  // shows up here instead of failing mid-conversation. Best-effort.
  const modelHealth = ai
    ? await checkModelHealth(ai, settings).catch(() => null)
    : null;

  return Response.json({
    account: email,
    env: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      voyage: Boolean(process.env.VOYAGE_API_KEY || process.env.VOYAGEAI_API_KEY),
      googleOauth: googleOauthConfigured(),
    },
    mail: mail
      ? { connected: true, provider: "imap", account: mail.email }
      : google
        ? { connected: true, provider: "gmail-mcp", account: google.email }
        : { connected: false },
    counts: {
      projects: projects.length,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      memory: kb.length,
      instructions: instructions.length,
      contacts: contacts.length,
    },
    ai: {
      provider,
      ready: Boolean(ai),
      model: ai?.model ?? null,
      modelsChecked: modelHealth?.checked ?? false,
      models: modelHealth?.models ?? [],
    },
    front: { configured: front.configured, connected: front.connected },
    pipedream: { configured: pipedream.configured },
    updates: getUpdatesInfo(),
  });
}
