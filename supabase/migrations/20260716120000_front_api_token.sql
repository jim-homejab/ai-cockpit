-- =========================================================
-- Front API token (direct Core API access)
--
-- A long-lived Front API token (Front → Settings → Developers → API tokens)
-- lets Chief read tagged conversations straight from Front's Core API — no
-- OAuth access-token expiry/refresh, and full account access so shared/private
-- tags resolve without namespace 403s.
--
-- The token is stored per user with row level security ENABLED and NO browser
-- policy, so the authenticated/anon roles get zero rows and can never read it.
-- Only service-role server paths (which bypass RLS and scope by the signed-in
-- user id) read the token; it is never returned to the browser.
-- =========================================================

create table if not exists public.front_api_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null check (char_length(btrim(token)) between 1 and 4096),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger front_api_config_set_updated_at
  before update on public.front_api_config
  for each row execute function public.set_updated_at();

-- RLS on, no policies: browser roles are denied every row, so the secret token
-- is unreadable from the client. service_role bypasses RLS for the trusted
-- server routes that scope by the authenticated user id.
alter table public.front_api_config enable row level security;
