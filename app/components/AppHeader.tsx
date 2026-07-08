import Link from "next/link";
import ChiefMonogram from "@/app/components/ChiefMonogram";

// The global top bar, on every app screen (rendered in the (app) layout):
// Chief's mark + wordmark on the left (→ Home), the account circle on the
// right (→ Config → Account). Replaces the per-page avatar so the profile is
// always one tap away.
export default function AppHeader({ initial }: { initial: string }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <Link href="/" aria-label="Home" className="flex items-center gap-2">
        <ChiefMonogram size={26} />
        <span className="font-serif text-[16px] font-medium text-ink">
          Chief
        </span>
      </Link>
      <Link
        href="/config/account"
        aria-label="Account & settings"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold text-ink-2"
        style={{ background: "var(--raised)" }}
      >
        {initial}
      </Link>
    </header>
  );
}
