"use client";

// The live Chief bar: binds the static bar to the conversation state (pending
// proposal count) and opens the sheet on tap. Sits in the fixed dock above the
// bottom nav on every screen.

import { usePathname } from "next/navigation";
import { useChief } from "./ChiefProvider";
import ChiefBar from "./ChiefBar";

export default function ChiefDock() {
  const { pendingCount, setOpen } = useChief();
  const pathname = usePathname();
  // The /chief page IS the conversation — no bar needed there.
  if (pathname?.startsWith("/chief")) return null;
  return (
    <ChiefBar
      pendingCount={pendingCount}
      pendingDetail="TAP TO REVIEW"
      onTap={() => setOpen(true)}
    />
  );
}
