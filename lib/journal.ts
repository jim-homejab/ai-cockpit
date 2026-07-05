// The activity journal — a lightweight "what happened" log, deliberately kept
// separate from the KB so entries never surface in semantic retrieval. Every
// executed action (Phase 3's approve-first writes) lands here as the audit
// trail. Session client + RLS; `metadata` carries structured context like the
// action name and payload summary.

import { createClient } from "@/lib/supabase/server";

export type JournalEntry = {
  id: string;
  title: string;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, title, note, metadata, created_at, updated_at";

export async function listJournal(limit = 200): Promise<JournalEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as JournalEntry[];
}

export type CreateJournalInput = {
  title: string;
  note?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createJournalEntry(
  input: CreateJournalInput,
): Promise<JournalEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journal")
    .insert({
      title: input.title,
      note: input.note ?? null,
      metadata: input.metadata ?? {},
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as JournalEntry;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("journal").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
