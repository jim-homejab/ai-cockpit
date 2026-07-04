// The "C" monogram — Chief's mark, always serif, always teal-family.
export default function ChiefMonogram({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-control border border-teal-border bg-teal-dim font-serif font-medium text-teal ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.53) }}
      aria-hidden="true"
    >
      C
    </div>
  );
}
