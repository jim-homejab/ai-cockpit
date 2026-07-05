// Hybrid KB search: embed the query with Voyage and fuse semantic + full-text
// ranking via the match_kb_chunks RPC. The RPC is SECURITY INVOKER and scoped
// to auth.uid(), so it can only search the signed-in user's chunks. If
// embedding fails the RPC degrades to lexical-only search.

import { createClient } from "@/lib/supabase/server";
import { embedOne, toVectorLiteral } from "@/lib/voyage";

export type KbHit = {
  chunk_id: string;
  document_id: string;
  title: string;
  content: string;
  score: number;
};

// Run the hybrid match RPC with an already-computed embedding literal (or null
// for lexical-only). Lets callers batch-embed many queries before matching.
export async function matchKb(
  queryText: string,
  embeddingLiteral: string | null,
  limit = 6,
): Promise<KbHit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_kb_chunks", {
    p_query_text: queryText,
    p_query_embedding: embeddingLiteral,
    p_match_count: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as KbHit[];
}

export async function searchKb(query: string, limit = 6): Promise<KbHit[]> {
  let embeddingLiteral: string | null = null;
  try {
    embeddingLiteral = toVectorLiteral(await embedOne(query, "query"));
  } catch (e) {
    // Fall back to lexical-only search.
    console.error("KB query embedding failed; using lexical search only:", e);
  }
  return matchKb(query, embeddingLiteral, limit);
}
