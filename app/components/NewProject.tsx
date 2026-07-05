"use client";

// Ghost "new project" affordance: a dashed row that expands into a name input.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProject() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    setBusy(false);
    if (res.ok) {
      const { project } = await res.json();
      setName("");
      setOpen(false);
      router.push(`/projects/${project.id}`);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center rounded-card border border-dashed border-hairline font-mono text-[11px] tracking-[0.1em] text-ink-3"
      >
        + NEW PROJECT
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name…"
        className="h-12 min-w-0 flex-1 rounded-control border border-hairline bg-surface px-3.5 text-body text-ink placeholder:text-ink-3"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="h-12 shrink-0 rounded-control px-4 font-mono text-[11px] tracking-[0.1em] disabled:opacity-50"
        style={{ background: "var(--teal-fill)", color: "var(--teal-on-fill)" }}
      >
        CREATE
      </button>
    </form>
  );
}
