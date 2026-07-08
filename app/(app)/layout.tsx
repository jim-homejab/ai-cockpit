import BottomNav from "@/app/components/BottomNav";
import ChiefProvider from "@/app/components/ChiefProvider";
import ChiefDock from "@/app/components/ChiefDock";
import ChiefSheet from "@/app/components/ChiefSheet";
import AppHeader from "@/app/components/AppHeader";
import { getAuthed } from "@/lib/auth";

// App shell: a global top bar (Chief mark + account circle) over scrollable
// page content, with the Chief bar + bottom nav docked underneath on every
// screen. ChiefProvider holds the one shared conversation (bar count, sheet,
// /chief page); the sheet overlays everything when open. Desktop is an
// adaptation of the phone layout for now (centered column).
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authed = await getAuthed();
  const email = authed
    ? (await authed.supabase.auth.getUser()).data.user?.email
    : null;
  const initial = (email?.[0] ?? "•").toUpperCase();

  return (
    <ChiefProvider>
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
        <AppHeader initial={initial} />
        <main className="flex-1 px-4 pb-44 pt-3">{children}</main>
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto max-w-[480px]">
            <ChiefDock />
            <BottomNav />
          </div>
        </div>
      </div>
      <ChiefSheet />
    </ChiefProvider>
  );
}
