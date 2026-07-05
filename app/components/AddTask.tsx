"use client";

// Quiet add-task composer: a single control-height input that posts on enter.
// Stays out of the way — the design's thumb-zone primary actions belong to
// Chief; this is just direct manipulation for the list owner.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddTask({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: clean, projectId: projectId ?? null }),
    });
    setTitle("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="h-12 min-w-0 flex-1 rounded-control border border-hairline bg-surface px-3.5 text-body text-ink placeholder:text-ink-3"
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="h-12 shrink-0 rounded-control px-4 font-mono text-[11px] tracking-[0.1em] disabled:opacity-50"
        style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
      >
        ADD
      </button>
    </form>
  );
}
