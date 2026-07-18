"use client";

// Client-side "Capture page": render the CURRENT screen's DOM to an image so
// Chief can see what the user is looking at. We target <main> (the page
// content), NOT a real pixel grab — html2canvas re-renders that DOM subtree, so
// the capture works even while the Chief sheet is open on top: the sheet is a
// sibling overlay of <main>, so it's naturally excluded (no hiding/flicker).
// The result is a normal image attachment (Chief reads images natively).

import type { ChatAttachment } from "@/lib/chat-attachments";

// Cap the longest side so the screenshot stays small enough to send.
const MAX_DIM = 1400;

export async function capturePageAttachment(): Promise<ChatAttachment> {
  const target = document.querySelector("main");
  if (!(target instanceof HTMLElement)) {
    throw new Error("There's no page to capture on this screen.");
  }
  const { default: html2canvas } = await import("html2canvas");
  // Resolve the app background so transparent regions don't render black.
  const bg =
    getComputedStyle(document.body).backgroundColor?.trim() || "#ffffff";
  const longest = Math.max(target.scrollWidth, target.scrollHeight, 1);
  // scale < 1 shrinks tall pages; clamp so short pages aren't upscaled and very
  // tall pages stay legible.
  const scale = Math.min(1, Math.max(0.4, MAX_DIM / longest));
  const canvas = await html2canvas(target, {
    backgroundColor: bg,
    scale,
    useCORS: true,
    logging: false,
    windowWidth: document.documentElement.clientWidth,
  });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const comma = dataUrl.indexOf(",");
  return {
    kind: "image",
    name: "page.jpg",
    mediaType: "image/jpeg",
    data: comma === -1 ? dataUrl : dataUrl.slice(comma + 1),
  };
}
