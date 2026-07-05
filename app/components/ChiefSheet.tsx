"use client";

// The expanded Chief sheet — a full-height overlay opened from the Chief bar
// on any screen. Header per spec: grabber, monogram, "LOOKING AT" mono label +
// the page context it was opened over, close X. Body is the shared
// conversation surface.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChief } from "./ChiefProvider";
import ChiefConversation from "./ChiefConversation";

export default function ChiefSheet() {
  const { open, setOpen, page } = useChief();
  const pathname = usePathname();

  // Lock the page scroll behind the sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const label =
    page?.label ??
    (pathname === "/"
      ? "Home"
      : (pathname ?? "/").split("/")[1]?.replace(/^\w/, (c) => c.toUpperCase()) ||
        "Home");

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Chief">
      {/* Backdrop */}
      <button
        aria-label="Close Chief"
        onClick={() => setOpen(false)}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />
      {/* Sheet */}
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col overflow-hidden rounded-t-sheet"
        style={{
          height: "92dvh",
          background: "var(--surface)",
          borderTop: "1px solid var(--hairline)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--hairline)" }}
            aria-hidden="true"
          />
        </div>

        {/* Header: monogram · LOOKING AT + context · close */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border font-serif text-[19px] font-medium text-teal"
            style={{
              background: "var(--teal-dim)",
              borderColor: "var(--teal-border)",
            }}
            aria-hidden="true"
          >
            C
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] tracking-[0.12em] text-ink-3">
              LOOKING AT
            </div>
            <div className="truncate text-[15px] font-semibold text-ink">
              {label}
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--hairline)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M1.5 1.5l9 9m0-9l-9 9"
                stroke="var(--ink-2)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="h-px" style={{ background: "var(--hairline)" }} />

        <ChiefConversation />
      </div>
    </div>
  );
}
