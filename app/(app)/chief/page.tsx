import ChiefFull from "./ChiefFull";

// Chief — the whole-picture conversation, full screen. The center C in the
// bottom nav lands here; the Chief bar on other screens opens the same
// conversation as an overlay sheet.
export const dynamic = "force-dynamic";

export default function ChiefPage() {
  return <ChiefFull />;
}
