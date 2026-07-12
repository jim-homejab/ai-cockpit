-- =========================================================
-- Sovereign Pipedream Connect configuration
--
-- Project metadata and logical connected accounts stay behind per-user RLS.
-- The Pipedream OAuth client id + client secret are stored together in
-- Supabase Vault and can only be decrypted by service-role-only RPCs called
-- from authenticated Chief server routes.
-- =========================================================

create table if not exists public.pipedream_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  project_id text not null check (project_id ~ '^proj_[a-zA-Z0-9]+$'),
  environment text not null check (environment in ('development', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pipedream_config_set_updated_at
  before update on public.pipedream_config
  for each row execute function public.set_updated_at();

alter table public.pipedream_config enable row level security;

create policy "pipedream_config_select_own" on public.pipedream_config
  for select to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.pipedream_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id text not null check (account_id ~ '^apn_[a-zA-Z0-9]+$'),
  app_slug text not null check (char_length(btrim(app_slug)) between 1 and 128),
  app_name text not null check (char_length(btrim(app_name)) between 1 and 160),
  account_name text,
  healthy boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pipedream_connections_user_account_idx
  on public.pipedream_connections (user_id, account_id);

create index if not exists pipedream_connections_user_app_idx
  on public.pipedream_connections (user_id, app_slug, created_at);

create trigger pipedream_connections_set_updated_at
  before update on public.pipedream_connections
  for each row execute function public.set_updated_at();

alter table public.pipedream_connections enable row level security;

create policy "pipedream_connections_own" on public.pipedream_connections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists private.pipedream_config_secrets (
  user_id uuid primary key references public.pipedream_config(user_id) on delete cascade,
  vault_secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table private.pipedream_config_secrets from public, anon, authenticated;
grant select, insert, update, delete on table private.pipedream_config_secrets to service_role;

create or replace function private.delete_pipedream_vault_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = old.vault_secret_id;
  return old;
end;
$$;

revoke all on function private.delete_pipedream_vault_secret()
  from public, anon, authenticated;
alter function private.delete_pipedream_vault_secret() owner to postgres;

create trigger pipedream_config_secrets_delete_vault
  before delete on private.pipedream_config_secrets
  for each row execute function private.delete_pipedream_vault_secret();

create or replace function public.chief_pipedream_upsert_config(
  p_user_id uuid,
  p_project_id text,
  p_environment text,
  p_credentials text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if p_project_id is null or p_project_id !~ '^proj_[a-zA-Z0-9]+$' then
    raise exception 'invalid Pipedream project id';
  end if;
  if p_environment not in ('development', 'production') then
    raise exception 'invalid Pipedream environment';
  end if;
  if p_credentials is null or btrim(p_credentials) = '' then
    raise exception 'Pipedream credentials must be non-empty';
  end if;

  insert into public.pipedream_config (user_id, project_id, environment)
  values (p_user_id, p_project_id, p_environment)
  on conflict (user_id) do update
    set project_id = excluded.project_id,
        environment = excluded.environment;

  select vault_secret_id into v_secret_id
  from private.pipedream_config_secrets
  where user_id = p_user_id;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_credentials,
      'chief:pipedream:' || p_user_id::text,
      'Chief Pipedream OAuth client credentials'
    );
    insert into private.pipedream_config_secrets (user_id, vault_secret_id)
    values (p_user_id, v_secret_id);
  else
    perform vault.update_secret(v_secret_id, p_credentials);
    update private.pipedream_config_secrets
      set updated_at = now()
      where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.chief_pipedream_runtime_config(
  p_user_id uuid
)
returns table (
  project_id text,
  environment text,
  credentials text
)
language sql
security invoker
set search_path = ''
as $$
  select c.project_id, c.environment, d.decrypted_secret
  from public.pipedream_config c
  join private.pipedream_config_secrets s on s.user_id = c.user_id
  join vault.decrypted_secrets d on d.id = s.vault_secret_id
  where c.user_id = p_user_id;
$$;

create or replace function public.chief_pipedream_delete_config(
  p_user_id uuid
)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.pipedream_config where user_id = p_user_id;
$$;

revoke all on function public.chief_pipedream_upsert_config(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.chief_pipedream_runtime_config(uuid)
  from public, anon, authenticated;
revoke all on function public.chief_pipedream_delete_config(uuid)
  from public, anon, authenticated;

grant execute on function public.chief_pipedream_upsert_config(uuid, text, text, text)
  to service_role;
grant execute on function public.chief_pipedream_runtime_config(uuid)
  to service_role;
grant execute on function public.chief_pipedream_delete_config(uuid)
  to service_role;
