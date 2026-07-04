// Home — Phase 1 placeholder. The real screen (narrative → top-3 → waiting-on →
// proposals) arrives with the focus view in Phase 5.

// Render per-request so the date line is today's, not the build's.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(new Date())
    .replace(",", " ·")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="text-micro text-ink-3">{dateLine}</div>
      <p className="text-narrative text-ink">
        <span className="chief-voice">
          Chief is being built. <span className="text-teal">The skeleton is up</span> — nav,
          tokens, and the bar below are real.
        </span>
      </p>
      <div className="rounded-card border border-hairline bg-surface p-5">
        <div className="text-micro mb-2 text-ink-3">NEXT UP</div>
        <p className="text-body text-ink-2">
          Projects, tasks, and the knowledge base land in Phase 2. The Chief loop — proposals
          you approve — lands in Phase 3.
        </p>
      </div>
    </div>
  );
}
