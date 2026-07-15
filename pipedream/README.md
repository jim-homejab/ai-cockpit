# Pipedream in Chief

Pipedream is the default connector path:

1. **MCP tools** — each connected account exposes that app's prebuilt actions
   through Pipedream's remote MCP. Reads default to Auto; writes stay on Ask.
   Google Calendar uses this path.
2. **Connect API Proxy** — when a prebuilt action is missing or too narrow,
   Chief can call the upstream API through Pipedream with the same managed
   OAuth grant (`pipedreamProxyRequest` in `lib/pipedream.ts`).

Calendar working does **not** prove Connect Proxy works — different path.

## Front conversation inventory

`search_front_conversations` (`lib/front-search.ts`):

1. Tries Connect Proxy with **relative** Front paths first (then full
   `https://api2.frontapp.com…` as fallback)
2. If Proxy fails, falls back to Pipedream MCP `list-conversations` and
   filters by tag name in Chief (same path as Inbox / Calendar MCP)

Use `diagnose_pipedream_connect` to compare MCP vs Proxy for Front and another
connected app.

Private tags on the proxy path still prefer Config **Front — teammate id** =
`tea_lm2n2` (`jim@homejab.com`).

Example ask:

> Search open Front conversations tagged "Chief Inbox Zero". Make no Front
> changes. Report the final count, then triage the oldest 10.

If results include `source: "mcp_list_filter"`, Proxy is still broken but
inventory came from MCP (recent open page, up to ~100).
