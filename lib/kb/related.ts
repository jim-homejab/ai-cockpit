// Shared "find existing entries on the same topic" helper. Every KB write
// surface needs to surface near-duplicates so the user can MERGE into an
// existing entry instead of creating a near-copy. Centralizing it keeps dedup
// behaviour identical everywhere.
//
// This is the CHEAP half of synthesis: one query embedding + the hybrid match
// RPC, no LLM. The expensive merge (combining two entries) is reconcileKbEntry.

import { searchKb, type KbHit } from "./search";

export type RelatedKbEntry = { id: string; title: string; snippet: string };

/**
 * Collapse hybrid-search hits (chunk-level, possibly several per document) into
 * at most `limit` distinct documents, newest match first. Shared by callers that
 * already have hits in hand (e.g. an importer that batch-embeds, then matches).
 */
export function topRelated(hits: KbHit[], limit = 3): RelatedKbEntry[] {
  const out: RelatedKbEntry[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.document_id)) continue;
    seen.add(h.document_id);
    out.push({ id: h.document_id, title: h.title, snippet: h.content });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Find up to `limit` existing KB entries on the same topic as a draft note.
 * Best-effort: embedding/search failures degrade to an empty list rather than
 * blocking the save. No score cutoff and never auto-merges — the nearest
 * neighbour isn't necessarily a true duplicate, so the merge choice stays an
 * explicit, reviewed click on whichever surface called this.
 */
export async function findRelatedKbEntries(
  note: { title: string; body: string },
  limit = 3,
): Promise<RelatedKbEntry[]> {
  const query = `${note.title}\n${note.body}`.trim();
  if (!query) return [];
  try {
    // Over-fetch a little so distinct-document dedupe still yields `limit`.
    const hits = await searchKb(query, Math.max(limit * 2, 6));
    return topRelated(hits, limit);
  } catch {
    return [];
  }
}
