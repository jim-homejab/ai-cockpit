import HomeClient from "./HomeClient";

// Home — the focus view. The ranked list, waiting-on strip, and Chief's
// narrative load client-side from /api/home so approvals and refreshes update
// in place. The account initial now lives in the global AppHeader (rendered in
// the (app) layout), so the page shell has nothing left to resolve server-side.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeClient />;
}
