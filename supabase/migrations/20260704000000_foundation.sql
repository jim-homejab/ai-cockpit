-- Chief foundation schema (Phase 1).
--
-- Sovereign single-user deployment: one Supabase Auth user, no allowlist, no
-- roles. Every table is scoped by `user_id uuid references auth.users` and RLS
-- does the real work — app code talks to the database through the user's
-- session client (anon key + auth cookie), never the service role in hot paths.
--
-- Ported from Email-wrapper's schema with the multi-tenant `user_email` /
-- `app_users` layer removed, plus the BUILD-BRIEF additions: `communications`
-- (append-only), task `waiting` status + `waiting_on_contact_id`, and the
-- project-state verification timestamp that drives the copper stale strip.

-- Embeddings support (semantic KB search, Voyage 1024-dim).
create extension if not exists vector with schema extensions;

-- Shared updated_at trigger helper. search_path is pinned empty so the function
-- can't be hijacked via a mutable path (now() resolves from pg_catalog).
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- contacts: people Chief tracks across channels
-- =========================================================
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  emails text[] not null default '{}',
  company text,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_idx on public.contacts (user_id, name);

create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
create policy "contacts_own" on public.contacts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- projects: the primary organizing layer
-- =========================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  summary text,                                   -- one-liner / elevator pitch
  owner text,                                     -- free-text owner name
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_status_check
    check (status in ('active', 'paused', 'done', 'archived'))
);

-- One project name per user (case-insensitive) so create-by-name can upsert
-- without casing-variant duplicates.
create unique index if not exists projects_user_name_idx
  on public.projects (user_id, lower(name));
create index if not exists projects_user_status_idx
  on public.projects (user_id, status);

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
create policy "projects_own" on public.projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- tasks: structured, rankable, project-linked
-- =========================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  -- `waiting` = blocked on someone external; pairs with waiting_on_contact_id
  -- so Home's Waiting-on strip can cross-reference communications.
  status text not null default 'not_started',
  priority text,
  impact text,
  category text,
  delegate_to text,
  effort text,
  due_at timestamptz,
  project_id uuid references public.projects(id) on delete set null,
  waiting_on_contact_id uuid references public.contacts(id) on delete set null,
  waiting_since timestamptz,  -- set when status enters 'waiting'; drives the aging dot (day ≥ N = copper)
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check
    check (status in ('not_started', 'in_progress', 'blocked', 'waiting', 'done')),
  constraint tasks_priority_check
    check (priority is null or priority in ('P0', 'P1', 'P2', 'P3', 'P4')),
  constraint tasks_impact_check
    check (impact is null or impact in ('low', 'medium', 'high')),
  constraint tasks_effort_check
    check (effort is null or effort in ('s', 'm', 'l'))
);

create index if not exists tasks_user_status_idx on public.tasks (user_id, status, due_at);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_waiting_contact_idx on public.tasks (waiting_on_contact_id)
  where waiting_on_contact_id is not null;

-- One row per (user, external id) when set, so re-importing an external list
-- updates rather than duplicates.
create unique index if not exists tasks_user_external_id_key
  on public.tasks (user_id, external_id)
  where external_id is not null;

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
create policy "tasks_own" on public.tasks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- project_state: Chief's single, editable current-state record per project
-- (1:1, replace-per-field). last_verified_at is the staleness signal that
-- drives the copper "Last verified N days ago" strip — set on every verified
-- state write, distinct from updated_at (which moves on any edit).
-- =========================================================
create table if not exists public.project_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  current_state text,     -- where this stands right now (the headline)
  next_action text,       -- the single most important next move (free-text fallback)
  next_task_id uuid references public.tasks(id) on delete set null,
  open_loops text,        -- what's outstanding / in flight
  blockers text,          -- what's stuck on us, and why
  waiting_on text,        -- what/who we're waiting on externally
  decisions text,         -- decisions made / direction set
  recent_changes text,    -- the running delta of what moved recently
  confidence text,        -- how sure we are about this record
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_state_confidence_check
    check (confidence is null or confidence in ('low', 'medium', 'high'))
);

create unique index if not exists project_state_project_idx
  on public.project_state (project_id);
create index if not exists project_state_user_idx
  on public.project_state (user_id);
create index if not exists project_state_next_task_idx
  on public.project_state (next_task_id);

create trigger project_state_set_updated_at before update on public.project_state
  for each row execute function public.set_updated_at();

alter table public.project_state enable row level security;
create policy "project_state_own" on public.project_state for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- kb_documents: knowledge base (prose) + full-text search
-- =========================================================
create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  source text not null default 'manual',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored
);

create index if not exists kb_documents_user_idx on public.kb_documents (user_id, updated_at desc);
create index if not exists kb_documents_fts_idx on public.kb_documents using gin (fts);

create trigger kb_documents_set_updated_at before update on public.kb_documents
  for each row execute function public.set_updated_at();

alter table public.kb_documents enable row level security;
create policy "kb_documents_own" on public.kb_documents for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- kb_chunks: chunked prose + embeddings for semantic search.
-- Dimension 1024 targets Voyage AI. Nullable until embeddings are generated.
-- =========================================================
create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1024),
  created_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  unique (document_id, chunk_index)
);

create index if not exists kb_chunks_user_idx on public.kb_chunks (user_id);
create index if not exists kb_chunks_doc_idx on public.kb_chunks (document_id);
create index if not exists kb_chunks_fts_idx on public.kb_chunks using gin (fts);
create index if not exists kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.kb_chunks enable row level security;
create policy "kb_chunks_own" on public.kb_chunks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- settings: per-user key/value config (markdown blobs + tunables).
-- Code falls back to compiled-in defaults when a key is absent.
-- =========================================================
create table if not exists public.settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;
create policy "settings_own" on public.settings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- journal: activity log / write audit. Every executed action lands here.
-- Kept separate from the KB so it never pollutes semantic retrieval.
-- =========================================================
create table if not exists public.journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_user_created_idx on public.journal (user_id, created_at desc);

create trigger journal_set_updated_at before update on public.journal
  for each row execute function public.set_updated_at();

alter table public.journal enable row level security;
create policy "journal_own" on public.journal for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- communications: append-only log of everything in/out across channels.
-- Chief chat turns are written here with channel='chief' — the AI chat
-- history page is a filtered view of this table. Insert-only: RLS grants
-- select + insert and nothing else, so app code cannot update or delete.
-- =========================================================
create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  channel text not null,                -- 'email' | 'chief' | 'sms' | ...
  direction text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  external_thread_id text,
  subject text,
  body_text text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint communications_direction_check check (direction in ('in', 'out'))
);

create index if not exists communications_user_occurred_idx
  on public.communications (user_id, occurred_at desc);
create index if not exists communications_contact_idx
  on public.communications (user_id, contact_id, occurred_at desc)
  where contact_id is not null;
create index if not exists communications_thread_idx
  on public.communications (user_id, external_thread_id)
  where external_thread_id is not null;

alter table public.communications enable row level security;
create policy "communications_select_own" on public.communications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "communications_insert_own" on public.communications
  for insert to authenticated
  with check (user_id = (select auth.uid()));
-- Deliberately no update/delete policies: the log is append-only.
