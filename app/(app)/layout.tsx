import BottomNav from "@/app/components/BottomNav";
import ChiefProvider from "@/app/components/ChiefProvider";
import ChiefDock from "@/app/components/ChiefDock";
import ChiefSheet from "@/app/components/ChiefSheet";

// App shell: scrollable page content with the global Chief bar + bottom nav
// docked underneath on every screen. ChiefProvider holds the one shared
// conversation (bar count, sheet, /chief page); the sheet overlays everything
// when open. Desktop is an adaptation of the phone layout for now (centered
// column).
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ChiefProvider>
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
        <main className="flex-1 px-4 pb-44 pt-4">{children}</main>
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
