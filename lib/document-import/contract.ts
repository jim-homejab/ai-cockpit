import type Anthropic from "@anthropic-ai/sdk";
import {
  WRITE_ACTIONS,
  type WriteAction,
  type WriteActionKey,
} from "@/lib/actions";

/** Bump only when the persisted manifest envelope changes incompatibly.
 * Action argument schemas stay current automatically because the tool schema
 * below is built directly from WRITE_ACTIONS, the executor's allowlist. */
export const DOCUMENT_IMPORT_CONTRACT_VERSION = 1;
export const DOCUMENT_IMPORT_TOOL_NAME = "submit_document_import_manifest";

/** Exhaustive by design: adding a write action requires an explicit decision
 * about whether documents may propose it. This is the contract drift gate. */
export const DOCUMENT_IMPORT_ACTION_POLICY = {
  create_task: "import",
  update_task: "import",
  save_kb_fact: "import",
  save_instruction: "import",
  save_contact: "import",
  create_note: "import",
  create_project: "import",
  update_project: "import",
  update_project_state: "import",
  archive_email: "exclude",
  reply_email: "exclude",
} as const satisfies Record<WriteActionKey, "import" | "exclude">;

export const DOCUMENT_IMPORT_ENTITY_KINDS = [
  "project",
  "task",
  "contact",
  "memory",
  "instruction",
  "note",
] as const;
export type DocumentImportEntityKind =
  (typeof DOCUMENT_IMPORT_ENTITY_KINDS)[number];

export const DOCUMENT_IMPORT_DISPOSITIONS = [
  "change",
  "no_change",
  "ambiguous",
  "ignore",
] as const;
export type DocumentImportDisposition =
  (typeof DOCUMENT_IMPORT_DISPOSITIONS)[number];

export type DocumentImportAction = {
  key: WriteActionKey;
  args: Record<string, unknown>;
};

export type DocumentImportRecord = {
  source_id: string;
  entity_kind: DocumentImportEntityKind;
  disposition: DocumentImportDisposition;
  source: {
    name: string;
    locator?: string;
    excerpt: string;
  };
  reason: string;
  actions: DocumentImportAction[];
};

export type DocumentImportManifest = {
  contract_version: number;
  source_reports: {
    source_name: string;
    status: "processed" | "failed";
    summary: string;
  }[];
  records: DocumentImportRecord[];
};

export type DocumentImportSummary = {
  contractVersion: number;
  sourceCount: number;
  recordCount: number;
  proposalCount: number;
  noChangeCount: number;
  ambiguousCount: number;
  ignoredCount: number;
  byKind: Partial<Record<DocumentImportEntityKind, number>>;
};

export type DocumentSourceHint = {
  sourceName: string;
  entityKind?: "project" | "task";
  expectedRecords?: number;
  description: string;
};

export function documentImportActions(): readonly WriteAction[] {
  return WRITE_ACTIONS.filter(
    (action) => DOCUMENT_IMPORT_ACTION_POLICY[action.key] === "import",
  );
}

function actionBranch(action: WriteAction): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      key: {
        type: "string",
        enum: [action.key],
        description: action.description,
      },
      args: {
        ...action.input_schema,
        additionalProperties: false,
      },
    },
    required: ["key", "args"],
  };
}

/** The model sees one typed manifest tool, not dozens of executable-looking
 * write tools. Its action branches are derived from the live write registry. */
export function documentImportTool(
  hints: DocumentSourceHint[],
): Anthropic.Tool {
  const inventory = hints.map((hint) => hint.description).join("\n");
  return {
    name: DOCUMENT_IMPORT_TOOL_NAME,
    description: [
      "Submit the complete replacement document-import manifest.",
      "Inventory every source entity exactly once, even when it needs no change, is ambiguous, or should be ignored.",
      "A change record may contain multiple ordered domain actions (for example create_project followed by update_project_state).",
      "Use source-local IDs that remain stable across revisions, and include a faithful evidence excerpt.",
      "Do not call ordinary write tools; trusted application code validates and compiles this manifest into approval cards.",
      inventory ? `Deterministic source inventory:\n${inventory}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        contract_version: {
          type: "integer",
          enum: [DOCUMENT_IMPORT_CONTRACT_VERSION],
          description: "The document import contract version.",
        },
        source_reports: {
          type: "array",
          description:
            "Exactly one report per attached source. A failed source makes the plan incomplete.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              source_name: { type: "string" },
              status: { type: "string", enum: ["processed", "failed"] },
              summary: { type: "string" },
            },
            required: ["source_name", "status", "summary"],
          },
        },
        records: {
          type: "array",
          description:
            "Complete source ledger. Every discovered project, task, person, durable fact, instruction, or note appears exactly once.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              source_id: {
                type: "string",
                description:
                  "Stable source-local ID such as tasks.md#homejab-marketing/task-1.",
              },
              entity_kind: {
                type: "string",
                enum: DOCUMENT_IMPORT_ENTITY_KINDS,
              },
              disposition: {
                type: "string",
                enum: DOCUMENT_IMPORT_DISPOSITIONS,
              },
              source: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  locator: {
                    type: "string",
                    description: "Page, heading, row, or other source location.",
                  },
                  excerpt: {
                    type: "string",
                    description: "Short verbatim evidence from the source.",
                  },
                },
                required: ["name", "excerpt"],
              },
              reason: {
                type: "string",
                description:
                  "Why this disposition and these actions faithfully represent the source.",
              },
              actions: {
                type: "array",
                description:
                  "One or more actions for change; empty for every other disposition.",
                items: { oneOf: documentImportActions().map(actionBranch) },
              },
            },
            required: [
              "source_id",
              "entity_kind",
              "disposition",
              "source",
              "reason",
              "actions",
            ],
          },
        },
      },
      required: ["contract_version", "source_reports", "records"],
    } as Anthropic.Tool["input_schema"],
  };
}
