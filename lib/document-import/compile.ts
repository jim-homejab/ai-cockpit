import {
  toProposedAction,
  type ProposedAction,
  type WriteActionKey,
} from "@/lib/actions";
import type {
  DocumentImportManifest,
  DocumentImportSummary,
} from "@/lib/document-import/contract";

const ACTION_ORDER: Record<WriteActionKey, number> = {
  create_project: 0,
  update_project: 1,
  save_contact: 2,
  create_task: 3,
  update_task: 4,
  update_project_state: 5,
  save_kb_fact: 6,
  save_instruction: 7,
  create_note: 8,
  archive_email: 99,
  reply_email: 99,
};

export function compileDocumentImportManifest(
  manifest: DocumentImportManifest,
): { proposals: ProposedAction[]; summary: DocumentImportSummary } {
  const compiled = manifest.records
    .flatMap((record, recordIndex) =>
      record.actions.map((action, actionIndex) => ({
        record,
        action,
        recordIndex,
        actionIndex,
      })),
    )
    .sort(
      (left, right) =>
        ACTION_ORDER[left.action.key] - ACTION_ORDER[right.action.key] ||
        left.recordIndex - right.recordIndex ||
        left.actionIndex - right.actionIndex,
    );

  const proposals = compiled.map(({ record, action }) => {
    const proposal = toProposedAction(action.key, action.args);
    if (!proposal) {
      throw new Error(
        `Validated import action ${action.key} could not be compiled.`,
      );
    }
    return {
      ...proposal,
      source: {
        sourceId: record.source_id,
        name: record.source.name,
        ...(record.source.locator
          ? { locator: record.source.locator }
          : {}),
        excerpt: record.source.excerpt,
      },
    };
  });

  const byKind: DocumentImportSummary["byKind"] = {};
  for (const record of manifest.records) {
    byKind[record.entity_kind] = (byKind[record.entity_kind] ?? 0) + 1;
  }
  return {
    proposals,
    summary: {
      contractVersion: manifest.contract_version,
      sourceCount: manifest.source_reports.length,
      recordCount: manifest.records.length,
      proposalCount: proposals.length,
      noChangeCount: manifest.records.filter(
        (record) => record.disposition === "no_change",
      ).length,
      ambiguousCount: manifest.records.filter(
        (record) => record.disposition === "ambiguous",
      ).length,
      ignoredCount: manifest.records.filter(
        (record) => record.disposition === "ignore",
      ).length,
      byKind,
    },
  };
}

export function formatDocumentImportVerification(
  summary: DocumentImportSummary,
): string {
  const kinds = Object.entries(summary.byKind)
    .filter(([, count]) => count)
    .map(([kind, count]) => `${count} ${kind}${count === 1 ? "" : "s"}`)
    .join(" · ");
  const dispositions = [
    `${summary.proposalCount} proposed changes`,
    summary.noChangeCount ? `${summary.noChangeCount} no-change` : "",
    summary.ambiguousCount ? `${summary.ambiguousCount} need review` : "",
    summary.ignoredCount ? `${summary.ignoredCount} ignored` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `Verified source ledger: ${summary.recordCount} records${kinds ? ` (${kinds})` : ""}. ${dispositions}.`;
}
