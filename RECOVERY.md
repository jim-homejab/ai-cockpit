# RECOVERY — break-glass for a bad deploy

Chief can edit and ship this app, and it runs **inside** the app. So if a bad
merge breaks production, Chief is down too and can't fix itself. Every step below
works entirely from **Vercel** and **GitHub** — no working app required. Skim it
once now so it's familiar before you ever need it.

## 1. Stop the bleeding — instant rollback (fastest)
Vercel → your project → **Deployments** → find the last known-good production
deployment → **⋯ menu → Promote to Production** (Instant Rollback). Production
serves the previous build immediately, with no rebuild.

## 2. Undo the code — revert the merge
GitHub → the merged PR → **Revert** (or `git revert -m 1 <merge-sha>` locally),
then merge the revert PR. Vercel redeploys the reverted code so the repo and
production agree again.

**Order:** do #1 to recover instantly, then #2 so the code matches what's live.

## 3. A bad database migration — the one you can't revert-PR
A `git revert` removes the migration **file** but does **not** undo a schema
change already applied to Supabase.

- **Prevent it:** migrations must be additive/backwards-compatible; never bundle a
  destructive change (drop/rename) with the code change; keep Supabase
  **PITR / backups on** (Supabase dashboard → Database → Backups).
- **If it happens:** restore from a Supabase backup / point-in-time recovery, or
  write a corrective *forward* migration. There is no one-click undo — which is
  why destructive schema changes are gated hardest and split into their own PR.

## 4. Chief is misbehaving (wrong, not down)
Turn **write actions off** in Config → AI to stop it proposing anything, and/or
revert the PR that changed its guardrail files (`AGENTS.md`, `lib/chief.ts`, and
the actions / broker / permission logic).

---

See `DEVMODE-PLAN.md` for how the dev loop works and `AGENTS.md` for the release
discipline these steps protect.
