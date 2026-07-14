// Front conversation search via Pipedream Connect API Proxy.
//
// Pipedream MCP exposes prebuilt Front actions; list-conversations cannot
// filter by tag/inbox/assignee. When a managed action is missing, Chief calls
// Front's Core API search through Connect Proxy with the owner's existing
// Front OAuth grant — no Front token in Chief.

import { createClient } from "@/lib/supabase/server";
import {
  findPipedreamConnectionByApp,
  pipedreamProxyRequest,
} from "@/lib/pipedream";
import {
  asRecord,
  buildOpenSearchQuery,
  buildTaggedOpenQuery,
  compactConversation,
  DEFAULT_FRONT_INBOX_ZERO_TAG,
  FRONT_API_BASE,
  FRONTAPP_PIPEDREAM_SLUG,
  pageTokenFromNext,
  resolveExactNamedResource,
  resolveExactTag,
  resultsFrom,
  teammateMatches,
  textField,
  type CompactFrontConversation,
} from "@/lib/front-search-helpers";

export {
  buildOpenSearchQuery,
  buildTaggedOpenQuery,
  compactConversation,
  DEFAULT_FRONT_INBOX_ZERO_TAG,
  FRONT_API_BASE,
  FRONTAPP_PIPEDREAM_SLUG,
  pageTokenFromNext,
  resolveExactTag,
  resultsFrom,
  type CompactFrontConversation,
} from "@/lib/front-search-helpers";

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to search Front.");
  return user.id;
}

async function frontProxyGet(
  userId: string,
  accountId: string,
  pathWithQuery: string,
): Promise<unknown> {
  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  return pipedreamProxyRequest(userId, {
    accountId,
    method: "GET",
    url: `${FRONT_API_BASE}${path}`,
  });
}

async function paginateCollection(
  userId: string,
  accountId: string,
  path: string,
  pick: (item: unknown) => boolean,
): Promise<unknown[]> {
  const matches: unknown[] = [];
  const seenPageTokens = new Set<string>();
  let pageToken: string | null = null;
  do {
    const qs = new URLSearchParams({ limit: "100" });
    if (pageToken) qs.set("page_token", pageToken);
    const response = await frontProxyGet(
      userId,
      accountId,
      `${path}?${qs}`,
    );
    for (const item of resultsFrom(response)) {
      if (pick(item)) matches.push(item);
    }
    const pagination = asRecord(asRecord(response)._pagination);
    pageToken = pageTokenFromNext(pagination.next);
    if (pageToken && seenPageTokens.has(pageToken)) {
      throw new Error(`Front repeated a pagination cursor for ${path}.`);
    }
    if (pageToken) seenPageTokens.add(pageToken);
  } while (pageToken);
  return matches;
}

async function resolveTagByName(
  userId: string,
  accountId: string,
  requestedName: string,
): Promise<{ id: string; name: string }> {
  const matches = await paginateCollection(
    userId,
    accountId,
    "/tags",
    (tag) =>
      textField(asRecord(tag).name).toLowerCase() ===
      requestedName.toLowerCase(),
  );
  return resolveExactTag(matches, requestedName);
}

async function resolveInboxByName(
  userId: string,
  accountId: string,
  requestedName: string,
): Promise<{ id: string; name: string }> {
  const matches = await paginateCollection(
    userId,
    accountId,
    "/inboxes",
    (inbox) =>
      textField(asRecord(inbox).name).toLowerCase() ===
      requestedName.toLowerCase(),
  );
  return resolveExactNamedResource(matches, requestedName, "inbox");
}

async function resolveTeammate(
  userId: string,
  accountId: string,
  requested: string,
): Promise<{ id: string; name: string }> {
  const matches = await paginateCollection(userId, accountId, "/teammates", (t) =>
    teammateMatches(t, requested),
  );
  if (matches.length === 0) {
    throw new Error(`Front teammate "${requested}" was not found.`);
  }
  if (matches.length > 1) {
    const exact = matches.filter((t) => {
      const email = textField(asRecord(t).email).toLowerCase();
      return email && email === requested.trim().toLowerCase();
    });
    const chosen = exact.length === 1 ? exact : matches;
    if (chosen.length > 1) {
      throw new Error(
        `More than one Front teammate matches "${requested}". Use their email.`,
      );
    }
    const item = asRecord(chosen[0]);
    return {
      id: textField(item.id),
      name:
        textField(item.name) ||
        `${textField(item.first_name)} ${textField(item.last_name)}`.trim() ||
        textField(item.email),
    };
  }
  const item = asRecord(matches[0]);
  const id = textField(item.id);
  const name =
    textField(item.name) ||
    `${textField(item.first_name)} ${textField(item.last_name)}`.trim() ||
    textField(item.email);
  if (!id || !name) throw new Error(`Front teammate "${requested}" was incomplete.`);
  return { id, name };
}

export type FrontSearchInput = {
  /** Exact tag name. Optional — omit to inventory all open conversations. */
  tagName?: string;
  /** Exact inbox name. Optional. */
  inboxName?: string;
  /** Teammate name or email for assignee: filter. Optional. */
  assignee?: string;
  /** Teammate name or email for participant: filter. Optional. */
  participant?: string;
  limit?: number;
  cursor?: string;
};

export type FrontSearchResult = {
  query: string;
  filters: {
    tag?: { id: string; name: string };
    inbox?: { id: string; name: string };
    assignee?: { id: string; name: string };
    participant?: { id: string; name: string };
  };
  account: string;
  count: number;
  total?: number;
  conversations: CompactFrontConversation[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** One compact page of open Front conversations matching optional filters. */
export async function searchFrontConversations(
  input: FrontSearchInput = {},
): Promise<FrontSearchResult> {
  const userId = await requireUserId();
  const connection = await findPipedreamConnectionByApp(
    userId,
    FRONTAPP_PIPEDREAM_SLUG,
  );
  if (!connection) {
    throw new Error(
      "Connect Front through Pipedream in Settings → Connections first.",
    );
  }

  const limitRaw =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.trunc(input.limit)
      : 25;
  const limit = Math.min(100, Math.max(1, limitRaw));
  const cursor = textField(input.cursor) || undefined;

  const tagName = textField(input.tagName);
  const inboxName = textField(input.inboxName);
  const assignee = textField(input.assignee);
  const participant = textField(input.participant);

  const filters: FrontSearchResult["filters"] = {};
  if (tagName) {
    filters.tag = await resolveTagByName(userId, connection.accountId, tagName);
  }
  if (inboxName) {
    filters.inbox = await resolveInboxByName(
      userId,
      connection.accountId,
      inboxName,
    );
  }
  if (assignee) {
    filters.assignee = await resolveTeammate(
      userId,
      connection.accountId,
      assignee,
    );
  }
  if (participant) {
    filters.participant = await resolveTeammate(
      userId,
      connection.accountId,
      participant,
    );
  }

  const query = buildOpenSearchQuery({
    tagId: filters.tag?.id,
    inboxId: filters.inbox?.id,
    assigneeId: filters.assignee?.id,
    participantId: filters.participant?.id,
  });
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("page_token", cursor);
  const response = await frontProxyGet(
    userId,
    connection.accountId,
    `/conversations/search/${encodeURIComponent(query)}?${qs}`,
  );

  const envelope = asRecord(response);
  const nextCursor = pageTokenFromNext(asRecord(envelope._pagination).next);
  const conversations = resultsFrom(response).map(compactConversation);
  const total =
    typeof envelope._total === "number" ? envelope._total : undefined;

  return {
    query,
    filters,
    account: connection.accountName ?? connection.accountId,
    count: conversations.length,
    ...(total !== undefined ? { total } : {}),
    conversations,
    nextCursor,
    hasMore: Boolean(nextCursor),
  };
}

/** @deprecated Prefer searchFrontConversations. Kept for the tagged-tool alias. */
export async function searchTaggedOpenConversations(input: {
  tagName?: string;
  limit?: number;
  cursor?: string;
}): Promise<FrontSearchResult> {
  return searchFrontConversations({
    tagName: textField(input.tagName) || DEFAULT_FRONT_INBOX_ZERO_TAG,
    limit: input.limit,
    cursor: input.cursor,
  });
}
