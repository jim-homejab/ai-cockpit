import ChiefMonogram from "@/app/components/ChiefMonogram";

// Chief — Phase 1 placeholder. The full sheet (context header, chat, inline
// proposal cards) arrives with the Chief loop in Phase 3.
export default function ChiefPage() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="text-micro text-ink-3">CHIEF</div>
      <div className="flex items-start gap-3">
        <ChiefMonogram size={28} className="mt-1" />
        <p className="chief-voice text-narrative text-ink">
          I&apos;m not listening yet. The conversation — and the proposals you approve — start
          in Phase 3.
        </p>
      </div>
    </div>
  );
}
