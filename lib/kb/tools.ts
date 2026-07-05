// Shared KB tool-use plumbing: the search_kb / read_kb tool definitions and a
// runner. Used by the Chief (Phase 3) so Claude can pull the user's saved
// facts mid-generation. These are READ tools — they run transparently in the
// loop; writes always go through the proposal gate.

import Anthropic from "@anthropic-ai/sdk";
import { searchKb } from "./search";
import { getKbDocument } from "./store";

export const KB_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_kb",
    description:
      "Search the user's memory (durable long-term context they've saved — notes, preferences, decisions, people/companies) for relevant passages. Returns the most relevant passages with their document ids.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for." },
        limit: {
          type: "integer",
          description: "Max passages to return (default 6).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_kb",
    description:
      "Read the full text of a single memory entry by its id (from search_kb results).",
    input_schema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "The KB document id." },
      },
      required: ["document_id"],
    },
  },
];

export function makeKbToolRunner() {
  return async function runTool(block: Anthropic.ToolUseBlock): Promise<string> {
    const input = (block.input ?? {}) as Record<string, unknown>;
    if (block.name === "search_kb") {
      const query = String(input.query ?? "").trim();
      if (!query) return "No query provided.";
      const limit = Math.min(Math.max(Number(input.limit) || 6, 1), 10);
      const hits = await searchKb(query, limit);
      if (hits.length === 0) return "No matching memory entries.";
      return hits
        .map((h) => `[document_id: ${h.document_id}] ${h.title}\n${h.content}`)
        .join("\n\n---\n\n");
    }
    if (block.name === "read_kb") {
      const id = String(input.document_id ?? "").trim();
      const doc = id ? await getKbDocument(id) : null;
      return doc ? `# ${doc.title}\n\n${doc.body}` : "Document not found.";
    }
    return `Unknown tool: ${block.name}`;
  };
}
