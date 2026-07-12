import assert from "node:assert/strict";
import test from "node:test";
import { WRITE_ACTIONS } from "@/lib/actions";
import {
  DOCUMENT_IMPORT_ACTION_POLICY,
  DOCUMENT_IMPORT_CONTRACT_VERSION,
  documentImportActions,
  documentImportTool,
} from "@/lib/document-import/contract";
import { inspectDocumentSources } from "@/lib/document-import/source-inventory";
import { validateDocumentImportManifest } from "@/lib/document-import/validate";
import { compileDocumentImportManifest } from "@/lib/document-import/compile";

const attachments = [
  {
    kind: "text" as const,
    name: "projects.md",
    text: "# Projects\n\n## Website\n\n**Current state:** Drafting.",
  },
  {
    kind: "text" as const,
    name: "tasks.md",
    text: "# Tasks\n\n## Website\n\n- [ ] **Publish the website**",
  },
];

function completeManifest() {
  return {
    contract_version: DOCUMENT_IMPORT_CONTRACT_VERSION,
    source_reports: [
      {
        source_name: "projects.md",
        status: "processed",
        summary: "One project.",
      },
      {
        source_name: "tasks.md",
        status: "processed",
        summary: "One task.",
      },
    ],
    records: [
      {
        source_id: "projects.md#website",
        entity_kind: "project",
        disposition: "change",
        source: {
          name: "projects.md",
          locator: "Website",
          excerpt: "## Website",
        },
        reason: "The project is not in the empty workspace.",
        actions: [
          {
            key: "create_project",
            args: { name: "Website", summary: "Publish the website" },
          },
          {
            key: "update_project_state",
            args: {
              project_name: "Website",
              current_state: "Drafting.",
              confidence: "high",
            },
          },
        ],
      },
      {
        source_id: "tasks.md#website/publish",
        entity_kind: "task",
        disposition: "change",
        source: {
          name: "tasks.md",
          locator: "Website",
          excerpt: "- [ ] **Publish the website**",
        },
        reason: "The task is open and absent from the workspace.",
        actions: [
          {
            key: "create_task",
            args: {
              title: "Publish the website",
              project_name: "Website",
            },
          },
        ],
      },
    ],
  };
}

test("document import policy exhaustively classifies write actions", () => {
  assert.deepEqual(
    Object.keys(DOCUMENT_IMPORT_ACTION_POLICY).sort(),
    WRITE_ACTIONS.map((action) => action.key).sort(),
  );
  assert.ok(
    documentImportActions().every(
      (action) =>
        DOCUMENT_IMPORT_ACTION_POLICY[
          action.key as keyof typeof DOCUMENT_IMPORT_ACTION_POLICY
        ] === "import" &&
        action.tier === "yellow",
    ),
  );
});

test("manifest tool derives every action branch from the write registry", () => {
  const tool = documentImportTool(inspectDocumentSources(attachments));
  const schema = tool.input_schema as unknown as {
    properties: {
      records: {
        items: {
          properties: {
            actions: { items: { oneOf: { properties: { key: { enum: string[] } } }[] } };
          };
        };
      };
    };
  };
  const keys = schema.properties.records.items.properties.actions.items.oneOf
    .map((branch) => branch.properties.key.enum[0])
    .sort();
  assert.deepEqual(
    keys,
    documentImportActions().map((action) => action.key).sort(),
  );
});

test("validates coverage and compiles dependencies in safe order", () => {
  const hints = inspectDocumentSources(attachments);
  const validation = validateDocumentImportManifest(
    completeManifest(),
    attachments.map((attachment) => attachment.name),
    hints,
    { projects: [], tasks: [] },
  );
  assert.equal(validation.ok, true);
  if (!validation.ok) return;

  const compiled = compileDocumentImportManifest(validation.manifest);
  assert.deepEqual(
    compiled.proposals.map((proposal) => proposal.key),
    ["create_project", "create_task", "update_project_state"],
  );
  assert.equal(compiled.summary.recordCount, 2);
  assert.equal(compiled.summary.proposalCount, 3);
  assert.deepEqual(compiled.summary.byKind, { project: 1, task: 1 });
  assert.equal(
    compiled.proposals[1].source?.sourceId,
    "tasks.md#website/publish",
  );
});

test("rejects a manifest that omits a deterministic source record", () => {
  const twoTaskAttachments = [
    attachments[0],
    {
      ...attachments[1],
      text: `${attachments[1].text}\n- [x] **Verify production**`,
    },
  ];
  const validation = validateDocumentImportManifest(
    completeManifest(),
    twoTaskAttachments.map((attachment) => attachment.name),
    inspectDocumentSources(twoTaskAttachments),
    { projects: [], tasks: [] },
  );
  assert.equal(validation.ok, false);
  if (validation.ok) return;
  assert.match(validation.errors.join("\n"), /expected 2 task records/);
});

test("rejects action fields that drift outside the live action schema", () => {
  const manifest = completeManifest();
  (
    manifest.records[1].actions[0] as { args: Record<string, unknown> }
  ).args = {
    title: "Publish the website",
    project_name: "Website",
    imaginary_database_column: "no",
  };
  const validation = validateDocumentImportManifest(
    manifest,
    attachments.map((attachment) => attachment.name),
    inspectDocumentSources(attachments),
    { projects: [], tasks: [] },
  );
  assert.equal(validation.ok, false);
  if (validation.ok) return;
  assert.match(
    validation.errors.join("\n"),
    /imaginary_database_column: is not part of the action contract/,
  );
});
