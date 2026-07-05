// Always-on operating instructions. Unlike facts (retrieved on relevance via
// search_kb), these are injected into every prompt so they shape Claude's
// behaviour directly — tone, what to push on, how to estimate, etc.

import { listInstructions } from "./store";

// Returns a formatted block to splice into a system prompt, or "" if the user
// has no instructions yet. Best-effort: callers should not fail if this throws.
export async function getInstructionsBlock(): Promise<string> {
  let items;
  try {
    items = await listInstructions();
  } catch (e) {
    console.error("Failed to load operating instructions:", e);
    return "";
  }
  if (!items || items.length === 0) return "";

  const lines = items.map((it) => {
    const body = it.body.trim();
    return it.title ? `- ${it.title}: ${body}` : `- ${body}`;
  });

  return [
    "--- HOW THE USER WANTS YOU TO WORK (always follow these) ---",
    "These are the user's standing instructions about their preferences, judgment,",
    "and how you should behave. Apply them in everything you do, even when not",
    "explicitly mentioned.",
    ...lines,
    "--- END INSTRUCTIONS ---",
  ].join("\n");
}
