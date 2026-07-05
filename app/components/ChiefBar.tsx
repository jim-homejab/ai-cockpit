"use client";

// The Chief bar — the product's signature element, global on every page,
// docked above the bottom nav. Collapsed idle and collapsed pending render to
// spec; tapping it opens the expanded sheet (ChiefSheet, via ChiefDock). It
// never bounces, loops, or turns red.

type ChiefBarProps = {
  /** Number of proposals waiting. 0 = idle ("All clear."). */
  pendingCount?: number;
  /** Mono status detail for the pending state, e.g. "OLDEST 24 MIN · TAP TO REVIEW". */
  pendingDetail?: string;
  /** Opens the Chief sheet. */
  onTap?: () => void;
};

export default function ChiefBar({
  pendingCount = 0,
  pendingDetail,
  onTap,
}: ChiefBarProps) {
  const pending = pendingCount > 0;

  return (
    <div className="px-3 pt-2">
      <button
        type="button"
        onClick={onTap}
        aria-label={pending ? `Open Chief — ${pendingCount} proposals waiting` : "Ask Chief"}
        className="box-border flex h-[60px] w-full items-center gap-3 rounded-bar border pl-3 pr-2.5 text-left"
        style={{
          background: pending ? "var(--bar-gradient-pending)" : "var(--bar-gradient)",
          borderColor: pending ? "var(--teal-border-strong)" : "var(--hairline)",
          boxShadow: pending ? "var(--bar-shadow-pending)" : "var(--bar-shadow)",
        }}
      >
        {/* Monogram — corner dot only when proposals are pending */}
        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-control border font-serif text-[19px] font-medium text-teal"
          style={{
            background: pending ? "var(--teal-dim-strong)" : "var(--teal-dim)",
            borderColor: pending ? "rgba(143,193,183,0.4)" : "var(--teal-border)",
          }}
          aria-hidden="true"
        >
          C
          {pending && (
            <span
              className="absolute -right-[3px] -top-[3px] h-[9px] w-[9px] rounded-full bg-teal"
              style={{ border: "2px solid var(--surface)" }}
            />
          )}
        </div>

        {/* Status: Chief's voice in serif italic + mono machine line */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="chief-voice truncate text-base leading-tight text-ink">
            {pending
              ? `${pendingCount} proposal${pendingCount === 1 ? "" : "s"} waiting.`
              : "All clear."}
          </div>
          <div
            className={`truncate font-mono text-[10px] tracking-[0.1em] ${pending ? "text-teal" : "text-ink-3"}`}
          >
            {pending ? (pendingDetail ?? "TAP TO REVIEW") : "ASK CHIEF"}
          </div>
        </div>

        {/* Right: count pill when pending, chevron-up when idle */}
        {pending ? (
          <div
            className="box-border flex h-[34px] min-w-[34px] shrink-0 items-center justify-center rounded-full px-1 font-mono text-sm font-medium"
            style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
          >
            {pendingCount}
          </div>
        ) : (
          <div
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
            style={{ border: "1px solid var(--hairline)" }}
            aria-hidden="true"
          >
            <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
              <path
                d="M1 6l5-5 5 5"
                stroke="var(--ink-2)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
}
