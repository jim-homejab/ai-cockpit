import BottomNav from "@/app/components/BottomNav";
import ChiefBar from "@/app/components/ChiefBar";

// App shell: scrollable page content with the global Chief bar + bottom nav
// docked underneath on every screen. Desktop is an adaptation of the phone
// layout for now (centered column); the 360px right-panel arrives with the
// Chief sheet.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <main className="flex-1 px-4 pb-44 pt-4">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-[480px]">
          <ChiefBar />
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
