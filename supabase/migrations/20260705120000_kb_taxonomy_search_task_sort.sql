-- Phase 2 additions: KB taxonomy (kinds + Area→Topic hierarchy), the hybrid
-- search RPC, and task ordering.
--
-- Same conventions as the foundation migration: every table scoped by
-- user_id → auth.users with RLS doing the real work; the app talks to
-- Postgres as the signed-in user.

-- =========================================================
-- kb_documents: kinds + Area → Topic taxonomy
-- 'fact' = retrieved on relevance via search; 'instruction' = always-on,
-- injected into every prompt (never returned by retrieval).
-- =========================================================
alter table public.kb_documents
  add column if not exists kind text not null default 'fact',
  add column if not exists area text,
  add column if not exists topic text;

alter table public.kb_documents
  drop constraint if exists kb_documents_kind_check;
alter table public.kb_documents
  add constraint kb_documents_kind_check check (kind in ('fact', 'instruction'));

create index if not exists kb_documents_user_kind_idx
  on public.kb_documents (user_id, kind, updated_at desc);
create index if not exists kb_documents_user_area_idx
  on public.kb_documents (user_id, area);

-- =========================================================
-- kb_areas: the curated Area → Topic taxonomy for browsing. `locked` marks an
-- area as a stable bucket classify-on-save may file new entries into. `kind`
-- says what the area holds (facts, instructions, or contacts) — display only.
-- =========================================================
create table if not exists public.kb_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  locked boolean not null default false,
  sort integer not null default 0,
  topics text[] not null default '{}',
  kind text not null default 'fact',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kb_areas_kind_check check (kind in ('fact', 'instruction', 'contact'))
);

create unique index if not exists kb_areas_user_name_idx
  on public.kb_areas (user_id, lower(name));

create trigger kb_areas_set_updated_at before update on public.kb_areas
  for each row execute function public.set_updated_at();

alter table public.kb_areas enable row level security;
create policy "kb_areas_own" on public.kb_areas for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =========================================================
-- match_kb_chunks: hybrid retrieval — pgvector semantic ranking fused with
-- full-text search via Reciprocal Rank Fusion. SECURITY INVOKER and scoped to
-- auth.uid(), so it can only ever search the calling user's own chunks (RLS
-- applies on top). p_query_embedding may be null (embeddings unavailable) →
-- degrades to lexical-only. Instruction documents are excluded inside each CTE
-- so they never crowd out facts.
-- =========================================================
create or replace function public.match_kb_chunks(
  p_query_text text,
  p_query_embedding extensions.vector(1024) default null,
  p_match_count int default 6
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  score double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with semantic as (
    select c.id, c.document_id,
           row_number() over (order by c.embedding <=> p_query_embedding) as rank
    from public.kb_chunks c
    where c.user_id = (select auth.uid())
      and p_query_embedding is not null
      and c.embedding is not null
      and exists (
        select 1 from public.kb_documents d
        where d.id = c.document_id and d.kind = 'fact'
      )
    order by c.embedding <=> p_query_embedding
    limit 20
  ),
  lexical as (
    select c.id, c.document_id,
           row_number() over (
             order by ts_rank(c.fts, websearch_to_tsquery('english', p_query_text)) desc
           ) as rank
    from public.kb_chunks c
    where c.user_id = (select auth.uid())
      and p_query_text is not null
      and p_query_text <> ''
      and c.fts @@ websearch_to_tsquery('english', p_query_text)
      and exists (
        select 1 from public.kb_documents d
        where d.id = c.document_id and d.kind = 'fact'
      )
    limit 20
  ),
  fused as (
    select
      coalesce(s.id, l.id) as id,
      coalesce(s.document_id, l.document_id) as document_id,
      coalesce(1.0 / (60 + s.rank), 0) + coalesce(1.0 / (60 + l.rank), 0) as score
    from semantic s
    full outer join lexical l on s.id = l.id
  )
  select f.id, f.document_id, d.title, c.content, f.score
  from fused f
  join public.kb_chunks c on c.id = f.id
  join public.kb_documents d on d.id = f.document_id
  order by f.score desc
  limit p_match_count;
$$;

-- =========================================================
-- tasks: user-controlled ordering within a project (the ⋮⋮ reorder handles on
-- the Project detail screen). Lower sorts first; ties fall back to priority.
-- =========================================================
alter table public.tasks
  add column if not exists sort integer not null default 0;

create index if not exists tasks_project_sort_idx
  on public.tasks (project_id, sort)
  where project_id is not null;
