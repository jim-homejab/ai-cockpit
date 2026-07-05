"use client";

// Page-context registration: a server page renders this (invisible) with a
// serializable snapshot of what it's showing, and Chief invocations from that
// screen carry it — the sheet header shows "LOOKING AT: <label>" and the model
// gets the state JSON. Unregisters on unmount so a stale snapshot never leaks
// onto the next screen.

import { useEffect } from "react";
import { useChief } from "./ChiefProvider";

export default function ChiefPageSnapshot({
  route,
  label,
  state,
  untrusted,
}: {
  route: string;
  label: string;
  state?: unknown;
  /** Mark true when `state` embeds external content (e.g. an email body) —
   *  the chief route then withholds open-world read tools for the turn. */
  untrusted?: boolean;
}) {
  const { setPage } = useChief();
  // The snapshot is serialized once per render pass; registering in an effect
  // keeps it out of the render cycle.
  const json = JSON.stringify(state ?? null);
  useEffect(() => {
    setPage({
      route,
      label,
      state: json === "null" ? undefined : (JSON.parse(json) as unknown),
      ...(untrusted ? { untrusted: true } : {}),
    });
    return () => setPage(null);
  }, [route, label, json, untrusted, setPage]);
  return null;
}
