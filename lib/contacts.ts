// People Chief tracks across channels. In Email-wrapper contacts were KB
// documents with kind="contact"; Chief promotes them to a real table (per the
// build brief) so tasks can reference `waiting_on_contact_id` and the
// communications log can attribute messages. Notes stay freeform prose.

import { createClient } from "@/lib/supabase/server";

export type Contact = {
  id: string;
  name: string;
  emails: string[];
  company: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, name, emails, company, notes, metadata, created_at, updated_at";

export async function listContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(COLUMNS)
    .order("name", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Contact[];
}

export async function getContact(id: string): Promise<Contact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Contact | null) ?? null;
}

/** Exact-match lookup by email (case-insensitive) — "who is this sender?". */
export async function getContactByEmail(email: string): Promise<Contact | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(COLUMNS)
    .contains("emails", [clean])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Contact | null) ?? null;
}

export type CreateContactInput = {
  name: string;
  emails?: string[];
  company?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

function normalizeEmails(emails?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails ?? []) {
    const e = String(raw).trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: input.name,
      emails: normalizeEmails(input.emails),
      company: input.company ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export type ContactPatch = {
  name?: string;
  emails?: string[];
  company?: string | null;
  notes?: string | null;
};

export async function updateContact(
  id: string,
  patch: ContactPatch,
): Promise<Contact | null> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.emails !== undefined) update.emails = normalizeEmails(patch.emails);
  if (patch.company !== undefined) update.company = patch.company;
  if (patch.notes !== undefined) update.notes = patch.notes;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update(update)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Contact | null) ?? null;
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
