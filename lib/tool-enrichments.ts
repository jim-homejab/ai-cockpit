// Optional curated polish for specific connector (broker) write tools: a
// hand-built label, tier, input schema, and preview keyed by (app, tool). When
// present, the chief route swaps in the schema and pins the tool (always
// attached, exempt from the per-turn cap), and toMcpProposal uses the
// label/tier/preview; when absent, the tool falls through to generic broker
// treatment (safe-default "irreversible" tier + raw arg dump preview).
//
// Enrichment is EDITORIAL ONLY — never authorization. Read/write gating is
// always re-derived live from MCP annotations, and an approved enriched write
// runs through the same server-keyed broker path as any other connector write.
//
// The registry ships empty; entries get added as specific connectors earn
// polish (e.g. a calendar event card with a proper date preview).

import type Anthropic from "@anthropic-ai/sdk";
import type { McpServerConfig } from "@/lib/mcp";
import type { McpToolDef } from "@/lib/mcp-broker";
import type { ActionTier } from "@/lib/actions";

export type ToolEnrichment = {
  /** App slug this applies to (matches server.app, falling back to server.name). */
  app: string;
  /** Bare tool name on the server (before any toolPrefix). */
  tool: string;
  /** Human label for the approval card. */
  label: string;
  /** Card tier: "yellow" = standard/reversible, "red" = irreversible. */
  tier: ActionTier;
  /** Optional replacement description shown to the model. */
  description?: string;
  /** Optional replacement input schema shown to the model. */
  input_schema?: Anthropic.Tool["input_schema"];
  /** Human-readable preview of the exact effect, for the approval card. */
  preview?: (args: Record<string, unknown>) => string;
};

const ENRICHMENTS: ToolEnrichment[] = [];

/** Look up the curated enrichment for a server's tool, if one exists. */
export function findEnrichment(
  server: McpServerConfig,
  toolName: string,
): ToolEnrichment | undefined {
  const bareTool =
    server.toolPrefix && toolName.startsWith(server.toolPrefix)
      ? toolName.slice(server.toolPrefix.length)
      : toolName;
  const app = server.app ?? server.name;
  return ENRICHMENTS.find((e) => e.app === app && e.tool === bareTool);
}

/** Apply an enrichment's model-facing polish (description/schema) to a broker
 *  tool definition. The read/write classification is never touched. */
export function applyEnrichment(
  def: McpToolDef,
  enrichment: ToolEnrichment | undefined,
): McpToolDef {
  if (!enrichment) return def;
  return {
    ...def,
    description: enrichment.description ?? def.description,
    inputSchema:
      (enrichment.input_schema as Record<string, unknown> | undefined) ??
      def.inputSchema,
  };
}
