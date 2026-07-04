# Database schema

The source of truth for Chief's database lives in `supabase/migrations/`.
Apply migrations to your Supabase project via the dashboard SQL editor, the
Supabase CLI (`supabase db push`), or the Supabase MCP tools.

## Conventions

- **One user per deployment.** Tenancy key is `user_id uuid references
  auth.users`, defaulting to `auth.uid()` on insert. There is no allowlist and
  no roles table — whoever the single Supabase Auth user is owns every row.
- **RLS does the real work.** App code talks to Postgres through the user's
  session client (anon key + auth cookie). Every table has RLS with
  `user_id = auth.uid()` policies. The service role is reserved for
  setup/migration scripts, never hot paths.
- **`communications` is append-only.** RLS grants `select` + `insert` only —
  no update/delete policies exist, so the app physically cannot rewrite
  history.

## Setup for a fresh deployment

1. Create a Supabase project.
2. Run each file in `migrations/` in filename order.
3. Create your one user: Dashboard → Authentication → Add user (email +
   password, autoconfirm).
4. Put the project URL + anon key in `.env.local` (see `.env.example`).
