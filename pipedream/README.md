# Pipedream in Chief

Pipedream is the default connector path:

1. **MCP tools** — each connected account exposes that app's prebuilt actions
   through Pipedream's remote MCP. Reads default to Auto; writes stay on Ask.
2. **Connect API Proxy** — when a prebuilt action is missing or too narrow,
   Chief can call the upstream API through Pipedream with the same managed
   OAuth grant (`pipedreamProxyRequest` in `lib/pipedream.ts`).

## Front conversation inventory

Front's public Pipedream `list-conversations` action cannot filter by tag,
inbox, or assignee. Chief therefore searches with the native read tool
`search_front_conversations` (`lib/front-search.ts`), which:

- defaults to open conversations (`is:open`) with no tag required
- optionally filters by exact tag, inbox, assignee, or participant
- calls Front Core API `GET /conversations/search/{query}` through Connect Proxy
- returns compact, paginated results for triage

No Front API token is stored in Chief. After inventory, use Front MCP tools to
read details and propose writes (archive, assign, tag, comment, draft reply).
Keep those write tools on **Ask** (not Off).

Example ask:

> Search open Front conversations. Follow `nextCursor` until `hasMore` is
> false. Make no Front changes. Report the final count, then triage the
> oldest 10 conversations.
