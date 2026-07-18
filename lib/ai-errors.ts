// Pure, dependency-free AI helpers: the free-model fallback chain and the
// error classifier. Kept apart from lib/ai.ts (which pulls in the Anthropic SDK
// and settings) so this logic can be unit-tested under `node --experimental-
// strip-types` without resolving runtime `@/` aliases. lib/ai.ts re-exports
// everything here, so call sites keep importing from "@/lib/ai".

// Free-tier gateway models Chief falls back to, in order, when the chosen
// premium model is unavailable to this account (e.g. no paid credits, no BYOK
// key). Keeps Chief answering — degraded, not dead — instead of the
// RestrictedModelsError a stranger hits on a carded-but-not-topped-up account.
//
// It is a CHAIN, not one id, on purpose: a single bogus/deprecated id makes the
// fallback itself 404 (`model_not_found`), which is worse than no fallback
// because it fails every request that routes to it (the `kimi-k2.7` outage).
// With a chain the gateway walks past a dead id to the next live one, so one
// model being renamed or retired can't sink the safety net. Every entry must be
// a real gateway id. Ordered most-reliable-first: `moonshotai/kimi-k2` is the
// canonical Kimi K2 Instruct id ("no other provider accounts required"), with a
// newer variant behind it for when the base id moves.
export const FREE_FALLBACK_MODELS = [
  "moonshotai/kimi-k2",
  "moonshotai/kimi-k2.6",
];

// ---------------------------------------------------------------------------
// Error classification
//
// Provider/gateway errors are opaque JSON blobs by default (the `404 {"error":
// {"message":"Model ... not found"}}` a user saw dumped into chat). Classify
// them so call sites can (a) show an actionable message instead of a raw blob
// and (b) decide whether a retry is worth attempting.
// ---------------------------------------------------------------------------

export type AiErrorKind =
  | "restricted" // account can't use this model — needs credits or a BYOK key
  | "model_not_found" // unknown/deprecated model id
  | "rate_limited" // 429 / overloaded — transient, retryable
  | "upstream" // 5xx from the gateway/provider — transient, retryable
  | "auth" // credential rejected
  | "unknown";

/** Bucket a thrown AI error. Reads both the HTTP status (when the SDK attaches
 *  one) and the message text, since the gateway encodes the useful detail in
 *  the body. */
export function classifyAiError(err: unknown): AiErrorKind {
  const status = (err as { status?: number })?.status;
  const text = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();

  if (
    text.includes("restricted") ||
    text.includes("do not have access") ||
    text.includes("free tier")
  ) {
    return "restricted";
  }
  if (
    text.includes("model_not_found") ||
    (text.includes("model") && text.includes("not found"))
  ) {
    return "model_not_found";
  }
  if (status === 429 || text.includes("rate limit") || text.includes("overloaded")) {
    return "rate_limited";
  }
  if (typeof status === "number" && status >= 500) return "upstream";
  if (status === 401 || status === 403) return "auth";
  return "unknown";
}

/** True for errors worth retrying with backoff (transient gateway/provider
 *  hiccups), as opposed to configuration errors that will fail identically on
 *  every retry. */
export function isRetryableAiError(err: unknown): boolean {
  const kind = classifyAiError(err);
  return kind === "rate_limited" || kind === "upstream";
}

/** A short, actionable, human-facing sentence for a thrown AI error — safe to
 *  stream into the chat. Falls back to the raw message only when we can't
 *  classify it. */
export function describeAiError(err: unknown): string {
  switch (classifyAiError(err)) {
    case "restricted":
      return "This AI model needs paid Vercel credits or your own Anthropic key. Add credits on Vercel, or paste an Anthropic key in Config → AI to run premium models on your own billing.";
    case "model_not_found":
      return "The AI model Chief is configured to use isn't available on the gateway. Check the model id (and its free-tier fallback) in Config → AI.";
    case "rate_limited":
      return "The AI gateway is rate-limited right now. Please wait a moment and try again.";
    case "upstream":
      return "The AI gateway hit a temporary upstream error. Please try again.";
    case "auth":
      return "Chief's AI credential was rejected. Re-check the gateway key / Secure Backend Access (OIDC) setup in Config → AI.";
    default:
      return err instanceof Error ? err.message : String(err);
  }
}
