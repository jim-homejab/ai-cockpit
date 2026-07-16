// Direct Front Core API access with a long-lived Front API token.
//
// This is the reliable path for the tagged Inbox: unlike the OAuth/MCP grant
// (which expires, needs refresh, and is bounded by the developer app's
// namespace access), a Front API token has full account access and never
// expires, so `GET /tags/{id}/conversations` resolves shared/private tags and
// pages through the complete inventory. The token is stored per user, readable
// only by service-role server code, and never returned to the browser.

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FRONT_API_BASE } from "@/lib/front-search-helpers";

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export type FrontApiStatus = {
  configured: boolean;
  /** True when the front_api_config table has not been migrated in yet. */
  needsMigration?: boolean;
};

/** The Front API token table/schema is not in this database yet. */
export function isFrontApiSchemaMissing(message: string): boolean {
  return /front_api_config|does not exist|schema cache|Could not find the table/i.test(
    message,
  );
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to configure Front.");
  return user.id;
}

/** The stored Front API token for the signed-in user, or null. */
export async function getFrontApiToken(): Promise<string | null> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return null;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("front_api_config")
    .select("token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return clean((data as { token?: unknown }).token) || null;
}

export async function getFrontApiStatus(): Promise<FrontApiStatus> {
  const userId = await requireUserId();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("front_api_config")
    .select("user_id, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isFrontApiSchemaMissing(error.message)) {
      return { configured: false, needsMigration: true };
    }
    throw new Error(error.message);
  }
  return { configured: Boolean(data) };
}

export async function saveFrontApiToken(rawToken: unknown): Promise<FrontApiStatus> {
  const token = clean(rawToken);
  if (!token) throw new Error("Paste your Front API token.");
  if (token.length > 4096) throw new Error("That Front API token looks too long.");
  const userId = await requireUserId();
  const admin = createAdminClient();
  const upsert = () =>
    admin.from("front_api_config").upsert(
      { user_id: userId, token, connected_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  let { error } = await upsert();
  // Deployed app can ship this migration before the owner runs /api/setup/migrate.
  if (error && isFrontApiSchemaMissing(error.message)) {
    const { runMigrations } = await import("@/lib/setup");
    await runMigrations();
    ({ error } = await upsert());
  }
  if (error) throw new Error(error.message);
  return { configured: true };
}

export async function deleteFrontApiToken(): Promise<void> {
  const userId = await requireUserId();
  const admin = createAdminClient();
  const { error } = await admin
    .from("front_api_config")
    .delete()
    .eq("user_id", userId);
  if (error && !isFrontApiSchemaMissing(error.message)) {
    throw new Error(error.message);
  }
}

/** GET a Front Core API path (relative to api2.frontapp.com) with the token. */
export async function frontApiGet(pathWithQuery: string): Promise<unknown> {
  const token = await getFrontApiToken();
  if (!token) {
    throw new Error("Set your Front API token in Settings → Connections first.");
  }
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const response = await fetch(`${FRONT_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 240);
    throw new Error(
      `Front API ${response.status} for ${path}${detail ? `: ${detail}` : ""}`,
    );
  }
  return response.json();
}

export function publicFrontApiError(
  error: unknown,
  fallback = "Front API request failed.",
): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return message ? message.slice(0, 400) : fallback;
}
