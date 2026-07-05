"use client";

// The /chief route: the conversation as a full screen (the center-C nav
// destination). Same shared conversation as the bar-opened sheet — opening one
// after the other continues where you left off. Fixed panel that stops above
// the bottom nav (the Chief bar itself is hidden on this route).

import { useChief } from "@/app/components/ChiefProvider";
import ChiefConversation from "@/app/components/ChiefConversation";

export default function ChiefFull() {
  const { messages, clear } = useChief();
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[480px] flex-col"
      style={{
        bottom: "calc(max(30px, env(safe-area-inset-bottom)) + 66px)",
        background: "var(--bg)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="text-micro text-ink-3">CHIEF</div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="font-mono text-[11px] tracking-[0.08em] text-ink-3"
          >
            NEW CONVERSATION
          </button>
        )}
      </div>
      <ChiefConversation />
    </div>
  );
}
