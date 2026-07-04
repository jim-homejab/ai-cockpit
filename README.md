# ai-cockpit — "Chief"

A self-hosted personal AI chief of staff. One user per deployment (your Vercel + your Supabase + your Anthropic key). Chief proposes; you approve.

## Start here

1. **`BUILD-BRIEF.md`** — the master build brief: architecture, port map from `jim-homejab/Email-wrapper`, data model, security rules, and six build phases.
2. **`handoff/`** — design source of truth from Claude Design (`HANDOFF.md` = tokens + intent, `Chief Design Spec.dc.html` = visual spec).

## For Claude Code

Read `BUILD-BRIEF.md` in full, read `handoff/HANDOFF.md`, then execute Phase 1. Each phase must end runnable. Never commit secrets; `.env*` is gitignored.
