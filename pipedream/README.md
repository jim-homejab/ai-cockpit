# Pipedream in Chief

Pipedream is the default connector path:

1. **MCP tools** — Calendar, Front list/get/write tools. Reads Auto; writes Ask.
2. **Connect API Proxy** — custom Front Core calls, especially
   [Front Search](https://dev.frontapp.com/docs/search-1):
   `GET /conversations/search/{query}` (e.g. `tag:tag_xxx is:open`).

## Front tagged inventory

`search_front_conversations`:

1. Resolve tag id via `tag_id`, Config **Front — Chief Inbox Zero tag id**,
   or name lookup
2. **Primary for tags:** `GET /tags/{id}/conversations` — includes Front
   **discussions with no inbox** (Search API alone misses those)
3. If that fails (and Search fallback is allowed), fall back to inbox-scoped
   Search API
4. If Proxy fails entirely on open inventory, MCP `list-conversations`
   (also inbox-scoped / recent page only)

No `inbox` tool parameter — tag inventory is not scoped to an inbox.
Pass `status=all` for full tag inventory (not just open).

The **Inbox** page Front tab requires Config `front.inbox_zero_tag_id` and
uses this same tag list with **no Search fallback** (so a Proxy failure is
visible instead of a silent under-count). Email is a separate tab
(Gmail/IMAP today; Outlook later via the same source pattern).

Private/individual tags: name lookup via `/teammates/{id}/tags` is often
denied through Connect Proxy — set Config **Front — Chief Inbox Zero tag id**
to skip it. Listing conversations uses
`GET https://api2.frontapp.com/tags/{id}/conversations` (absolute first):
relative `/tags/{id}/conversations` has returned **403** through Connect Proxy
even when the same absolute URL returned the full tagged set (~23) for the
same grant. That is a proxy-target quirk, not the Front preference / Private
Resources toggles. See https://help.front.com/en/articles/2516 for real
private-resource denials (message: "You do not have access to the resources
of this teammate").

`diagnose_pipedream_connect` probes `/me`, company `/tags`, teammate
`/teammates/{tea}/tags` (when Config teammate id is set), and
`/conversations/search` separately. A 403 on teammate `/tags` while other
Front proxy paths succeed is a **known gap** (not broken Pipedream project
credentials) — set Config **Front — Chief Inbox Zero tag id** to skip it.

### Finding `tag_…`

The numeric id in Front's tag settings URL is **not** the Core API id. Use:

- MCP `get-conversation` on a conversation that has the tag → `tags[].id`
- Front network tab when opening that tag in the UI

Config **Front — teammate id** = `tea_lm2n2` helps private-tag scoping on the
proxy path; Config **Front — Chief Inbox Zero tag id** skips name lookup.
