import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_FALLBACK_MODELS,
  classifyAiError,
  isRetryableAiError,
  describeAiError,
} from "../lib/ai-errors.ts";

// The bug this whole change traces back to: a fallback model id the gateway
// doesn't serve turns a graceful degradation into a hard 404. Guard the shape
// of the chain so a bogus/placeholder id can't creep back in unnoticed.
test("fallback chain is a non-trivial list of real gateway ids", () => {
  assert.ok(Array.isArray(FREE_FALLBACK_MODELS));
  // A chain (>1) so one dead id can't sink the safety net.
  assert.ok(FREE_FALLBACK_MODELS.length >= 2);
  // No duplicates.
  assert.equal(new Set(FREE_FALLBACK_MODELS).size, FREE_FALLBACK_MODELS.length);
  for (const id of FREE_FALLBACK_MODELS) {
    // Gateway ids are provider-prefixed.
    assert.match(id, /^[a-z0-9.-]+\/[a-z0-9._-]+$/);
  }
  // The never-again assertion: the placeholder that caused the outage.
  assert.ok(!FREE_FALLBACK_MODELS.includes("moonshotai/kimi-k2.7"));
});

test("classifyAiError buckets the errors we act on", () => {
  // The exact blob a user saw dumped into chat.
  assert.equal(
    classifyAiError(
      new Error(
        '404 {"error":{"message":"Model \'moonshotai/kimi-k2.7\' not found","type":"model_not_found"}}',
      ),
    ),
    "model_not_found",
  );
  assert.equal(
    classifyAiError(new Error("Free tier users do not have access to this model")),
    "restricted",
  );

  const rate = Object.assign(new Error("Too Many Requests"), { status: 429 });
  assert.equal(classifyAiError(rate), "rate_limited");

  const upstream = Object.assign(new Error("Bad Gateway"), { status: 502 });
  assert.equal(classifyAiError(upstream), "upstream");

  const auth = Object.assign(new Error("Forbidden"), { status: 403 });
  assert.equal(classifyAiError(auth), "auth");

  assert.equal(classifyAiError(new Error("something odd")), "unknown");
});

test("only transient errors are retryable", () => {
  assert.equal(
    isRetryableAiError(Object.assign(new Error("x"), { status: 429 })),
    true,
  );
  assert.equal(
    isRetryableAiError(Object.assign(new Error("x"), { status: 503 })),
    true,
  );
  // Config errors would fail identically on retry.
  assert.equal(
    isRetryableAiError(new Error("model_not_found")),
    false,
  );
  assert.equal(
    isRetryableAiError(new Error("Free tier users do not have access")),
    false,
  );
});

test("describeAiError yields an actionable sentence, not a raw blob", () => {
  const msg = describeAiError(new Error("model_not_found"));
  assert.ok(!msg.includes("{"));
  assert.match(msg, /Config/);

  const restricted = describeAiError(new Error("Free tier users do not have access"));
  assert.match(restricted, /credits|Anthropic key/);

  // Unknown errors pass through their message so nothing is swallowed.
  assert.equal(describeAiError(new Error("weird thing")), "weird thing");
});
