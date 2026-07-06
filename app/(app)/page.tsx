import { getAuthed } from "@/lib/auth";
import HomeClient from "./HomeClient";

// Home — the focus view. The server shell only resolves the avatar initial;
// the ranked list, waiting-on strip, and Chief's narrative load client-side
// from /api/home so approvals and refreshes update in place.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authed = await getAuthed();
  const email = authed
    ? (await authed.supabase.auth.getUser()).data.user?.email
    : null;
  const initial = (email?.[0] ?? "•").toUpperCase();
  return <HomeClient initial={initial} />;
}
