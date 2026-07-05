// Single-user auth helper. Being signed in IS the authorization — no
// allowlist, no roles. Data access happens through the session-bound Supabase
// client, so RLS enforces row ownership on every query; this helper just
// answers "is there a user at all?" for API routes.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AuthedClient = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

/** The session client + user id, or null when not signed in. */
export async function getAuthed(): Promise<AuthedClient | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

/** 401 response for unauthenticated API calls. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}
