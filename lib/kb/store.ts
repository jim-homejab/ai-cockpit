// KB write + read helpers. Ported from Email-wrapper with the tenancy flipped
// to RLS (session client — every query is scoped to the signed-in user by
// Postgres, not by an explicit tenant key). Contacts moved to their own table
// (lib/contacts.ts); the KB holds facts and instructions.
//
// Embeddings are best-effort: if Voyage is unavailable we still store the
// document and chunks (with null embeddings) so full-text search keeps working
// and the chunks can be backfilled later.

import { createClient } from "@/lib/supabase/server";
import { chunkText } from "./chunk";
import { embedTexts, toVectorLiteral } from "@/lib/voyage";
import { classifyArea } from "./classify";

export type KbKind = "fact" | "instruction";

export type KbDocumentSummary = {
  id: string;
  title: string;
  source: string;
  kind: KbKind;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Two-level hierarchy for browsing (Area → Topic → Entry). Both nullable; a
  // null area means the entry is "Unfiled" until classify-on-save files it.
  area?: string | null;
  topic?: string | null;
};

export type KbDocument = KbDocumentSummary & { body: string };

const SUMMARY_COLUMNS =
  "id, title, source, kind, tags, area, topic, created_at, updated_at";
const FULL_COLUMNS =
  "id, title, body, source, kind, tags, area, topic, created_at, updated_at";

export type CreateKbDocumentInput = {
  title: string;
  body: string;
  source?: string;
  tags?: string[];
  kind?: KbKind;
  area?: string | null;
  topic?: string | null;
};

/**
 * Normalize free-text tags so the KB vocabulary stays consistent: trim,
 * lowercase, collapse inner whitespace, drop empties, dedupe (keep first
 * occurrence), and cap the count. Stops casing/spacing variants of the same
 * tag ("Pricing" / "pricing " / "pricing") from multiplying into clutter.
 */
export function normalizeTags(tags?: string[] | null): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

// Chunk + embed a body and insert the chunk rows for a document.
async function insertChunks(documentId: string, body: string): Promise<void> {
  const supabase = await createClient();
  const chunks = chunkText(body);
  if (chunks.length === 0) return;

  let embeddings: number[][] | null = null;
  try {
    embeddings = await embedTexts(chunks, "document");
  } catch (e) {
    // Non-fatal: store without embeddings, FTS still covers the document.
    console.error("KB embedding failed; storing chunks without vectors:", e);
  }

  const rows = chunks.map((content, i) => ({
    document_id: documentId,
    chunk_index: i,
    content,
    embedding: embeddings ? toVectorLiteral(embeddings[i]) : null,
  }));

  const { error } = await supabase.from("kb_chunks").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createKbDocument(
  input: CreateKbDocumentInput,
): Promise<KbDocumentSummary> {
  const supabase = await createClient();

  const kind = input.kind ?? "fact";
  let area = input.area?.trim() || null;
  let topic = input.topic?.trim() || null;

  // Classify-on-save: a new fact with no explicit area gets auto-filed into the
  // user's existing locked areas (the AI-derived taxonomy). Best-effort — any
  // failure leaves it Unfiled rather than blocking the save.
  if (kind === "fact" && !area) {
    try {
      const locked = (await listKbAreas()).filter((a) => a.locked);
      if (locked.length > 0) {
        const topicsByArea = await listAreaTopics();
        const chosen = await classifyArea({
          areas: locked.map((a) => ({
            name: a.name,
            description: a.description,
            topics: topicsByArea.get(a.name) ?? [],
          })),
          title: input.title,
          body: input.body,
          tags: input.tags,
        });
        if (chosen) {
          area = chosen.area;
          topic = chosen.topic;
        }
      }
    } catch {
      /* leave Unfiled */
    }
  }

  const { data: doc, error } = await supabase
    .from("kb_documents")
    .insert({
      title: input.title,
      body: input.body,
      source: input.source ?? "manual",
      tags: normalizeTags(input.tags),
      kind,
      area,
      topic,
    })
    .select(SUMMARY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);

  await insertChunks(doc.id, input.body);
  return doc as KbDocumentSummary;
}

export async function listKbDocuments(
  kind: KbKind = "fact",
): Promise<KbDocumentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_documents")
    .select(SUMMARY_COLUMNS)
    .eq("kind", kind)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as KbDocumentSummary[];
}

/**
 * The user's existing fact-tag vocabulary, most-frequent first. Surfaced to the
 * assistant when it proposes saving a fact, so it reuses established tags rather
 * than inventing near-duplicates (pricing/price/costs).
 */
export async function listKbTags(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_documents")
    .select("tags")
    .eq("kind", "fact")
    .limit(500);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const t of (row as { tags?: string[] }).tags ?? []) {
      const k = String(t).trim().toLowerCase();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

// Always-on instructions, with bodies, ordered oldest-first so the user's stated
// priority order is preserved when injected into prompts.
export async function listInstructions(): Promise<KbDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_documents")
    .select(FULL_COLUMNS)
    .eq("kind", "instruction")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as KbDocument[];
}

export async function getKbDocument(id: string): Promise<KbDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_documents")
    .select(FULL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as KbDocument | null) ?? null;
}

export type UpdateKbDocumentInput = {
  title?: string;
  body?: string;
  tags?: string[];
  kind?: KbKind;
  area?: string | null;
  topic?: string | null;
};

// Re-chunk + re-embed a document's body (delete old chunks, insert fresh ones),
// so semantic search never drifts from the stored prose after an edit/merge.
async function reindexChunks(documentId: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("kb_chunks")
    .delete()
    .eq("document_id", documentId);
  if (error) throw new Error(error.message);
  await insertChunks(documentId, body);
}

export async function updateKbDocument(
  id: string,
  patch: UpdateKbDocumentInput,
): Promise<KbDocumentSummary | null> {
  const supabase = await createClient();

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.body !== undefined) update.body = patch.body;
  if (patch.tags !== undefined) update.tags = normalizeTags(patch.tags);
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.area !== undefined) update.area = patch.area?.trim() || null;
  if (patch.topic !== undefined) update.topic = patch.topic?.trim() || null;

  const { data, error } = await supabase
    .from("kb_documents")
    .update(update)
    .eq("id", id)
    .select(SUMMARY_COLUMNS)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  if (patch.body !== undefined) {
    await reindexChunks(id, patch.body);
  }
  return data as KbDocumentSummary;
}

export async function deleteKbDocument(id: string): Promise<void> {
  const supabase = await createClient();
  // kb_chunks cascade-delete via FK.
  const { error } = await supabase.from("kb_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Areas (the curated Area → Topic taxonomy) ---------------------------
// kb_areas is the source of truth for which high-level areas exist and how they
// present (icon/description/order). `locked` marks an area as a stable bucket
// classify-on-save is allowed to file new entries into.

export type KbAreaKind = "fact" | "instruction" | "contact";

export type KbArea = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  locked: boolean;
  sort: number;
  // Ordered template sub-topics for this area (shown even when empty), so an
  // area can define a durable structure you fill in over time.
  topics: string[];
  // What the area holds: a topic bucket for facts, the home for instructions,
  // or the home for contacts. Display only — behavior comes from the kind of
  // the records themselves.
  kind: KbAreaKind;
};

/**
 * Map of area name -> its distinct topics, derived from filed facts. Surfaced to
 * classify-on-save so new entries reuse an area's established topics instead of
 * inventing near-duplicates.
 */
export async function listAreaTopics(): Promise<Map<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_documents")
    .select("area, topic")
    .eq("kind", "fact")
    .not("area", "is", null)
    .limit(1000);
  if (error) throw new Error(error.message);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const a = (row as { area?: string | null }).area;
    const t = (row as { topic?: string | null }).topic;
    if (!a) continue;
    if (!map.has(a)) map.set(a, []);
    if (t && !map.get(a)!.includes(t)) map.get(a)!.push(t);
  }
  return map;
}

export async function listKbAreas(): Promise<KbArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_areas")
    .select("id, name, description, icon, locked, sort, topics, kind")
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({
    ...a,
    topics: a.topics ?? [],
    kind: (a.kind ?? "fact") as KbAreaKind,
  })) as KbArea[];
}

export type AreaInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  locked?: boolean;
  sort?: number;
  topics?: string[];
  kind?: KbAreaKind;
};

/**
 * Replace the user's area taxonomy with the given set: upsert each area by name
 * (case-insensitive, via the unique index) and delete any existing area no
 * longer present. Entries keep their denormalized `area` string, so dropping an
 * area row here doesn't unfile its entries — it just removes it from the curated
 * list until re-created.
 */
export async function saveKbAreas(
  userId: string,
  areas: AreaInput[],
): Promise<KbArea[]> {
  const supabase = await createClient();

  const rows = areas.map((a, i) => ({
    user_id: userId,
    name: a.name.trim(),
    description: a.description?.trim() || null,
    icon: a.icon?.trim() || null,
    locked: a.locked ?? false,
    sort: a.sort ?? i,
    topics: (a.topics ?? []).map((t) => t.trim()).filter(Boolean),
    kind: a.kind ?? "fact",
  }));

  const keepNames = new Set(rows.map((r) => r.name.toLowerCase()));
  const existing = await listKbAreas();
  const toDelete = existing.filter((a) => !keepNames.has(a.name.toLowerCase()));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("kb_areas")
      .delete()
      .in(
        "id",
        toDelete.map((a) => a.id),
      );
    if (delErr) throw new Error(delErr.message);
  }

  // Match-by-name (case-insensitive) → update-or-insert. We can't use a single
  // PostgREST upsert here: name uniqueness is enforced by an expression index on
  // (user_id, lower(name)), and ON CONFLICT can only target a unique index on
  // bare columns. Splitting into explicit updates/inserts keeps the
  // case-insensitive match and preserves each kept area's id/created_at.
  const existingByName = new Map(existing.map((a) => [a.name.toLowerCase(), a]));
  for (const row of rows) {
    const match = existingByName.get(row.name.toLowerCase());
    if (match) {
      const { error } = await supabase
        .from("kb_areas")
        .update(row)
        .eq("id", match.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("kb_areas").insert(row);
      if (error) throw new Error(error.message);
    }
  }

  return listKbAreas();
}

/**
 * Apply an organize pass's per-entry assignments: set `area`/`topic` on each
 * referenced document in one pass. RLS restricts the writes to the user's own
 * documents.
 */
export async function applyAreaAssignments(
  assignments: { id: string; area: string | null; topic: string | null }[],
): Promise<number> {
  const supabase = await createClient();
  let applied = 0;
  for (const a of assignments) {
    const { error } = await supabase
      .from("kb_documents")
      .update({ area: a.area?.trim() || null, topic: a.topic?.trim() || null })
      .eq("id", a.id);
    if (error) throw new Error(error.message);
    applied += 1;
  }
  return applied;
}
