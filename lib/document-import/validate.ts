import {
  DOCUMENT_IMPORT_ACTION_POLICY,
  DOCUMENT_IMPORT_CONTRACT_VERSION,
  DOCUMENT_IMPORT_DISPOSITIONS,
  DOCUMENT_IMPORT_ENTITY_KINDS,
  type DocumentImportAction,
  type DocumentImportEntityKind,
  type DocumentImportManifest,
  type DocumentSourceHint,
} from "@/lib/document-import/contract";
import {
  getWriteAction,
  isEmptyUpdate,
  type WriteActionKey,
} from "@/lib/actions";

export type DocumentImportContext = {
  projects: { id: string; name: string }[];
  tasks: { id: string; status: string }[];
};

export type ManifestValidationResult =
  | { ok: true; manifest: DocumentImportManifest }
  | { ok: false; errors: string[] };

const ENTITY_ACTIONS: Record<DocumentImportEntityKind, Set<WriteActionKey>> = {
  project: new Set([
    "create_project",
    "update_project",
    "update_project_state",
  ]),
  task: new Set(["create_task", "update_task"]),
  contact: new Set(["save_contact"]),
  memory: new Set(["save_kb_fact"]),
  instruction: new Set(["save_instruction"]),
  note: new Set(["create_note"]),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSchema(
  value: unknown,
  schemaValue: unknown,
  path: string,
): string[] {
  if (!isRecord(schemaValue)) return [`${path}: action schema is invalid.`];
  const schema = schemaValue;
  const errors: string[] = [];
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.map(String).join(", ")}.`);
    return errors;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") errors.push(`${path}: must be a string.`);
    return errors;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") errors.push(`${path}: must be a boolean.`);
    return errors;
  }
  if (schema.type === "integer") {
    if (!Number.isInteger(value)) errors.push(`${path}: must be an integer.`);
    return errors;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return [`${path}: must be an array.`];
    value.forEach((item, index) => {
      errors.push(...validateSchema(item, schema.items, `${path}[${index}]`));
    });
    return errors;
  }
  if (schema.type === "object") {
    if (!isRecord(value)) return [`${path}: must be an object.`];
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required)
      ? schema.required.map(String)
      : [];
    for (const key of required) {
      if (!(key in value)) {
        errors.push(`${path}.${key}: is required.`);
      } else if (
        isRecord(properties[key]) &&
        properties[key].type === "string" &&
        !nonEmptyString(value[key])
      ) {
        errors.push(`${path}.${key}: must not be empty.`);
      }
    }
    for (const [key, item] of Object.entries(value)) {
      if (!(key in properties)) {
        errors.push(`${path}.${key}: is not part of the action contract.`);
        continue;
      }
      errors.push(
        ...validateSchema(item, properties[key], `${path}.${key}`),
      );
    }
    return errors;
  }
  return errors;
}

function validateAction(
  raw: unknown,
  entityKind: DocumentImportEntityKind,
  path: string,
): { action?: DocumentImportAction; errors: string[] } {
  if (!isRecord(raw)) return { errors: [`${path}: must be an object.`] };
  const key = raw.key;
  if (!nonEmptyString(key) || !(key in DOCUMENT_IMPORT_ACTION_POLICY)) {
    return { errors: [`${path}.key: unknown write action.`] };
  }
  const actionKey = key as WriteActionKey;
  if (DOCUMENT_IMPORT_ACTION_POLICY[actionKey] !== "import") {
    return { errors: [`${path}.key: ${key} is not allowed in document imports.`] };
  }
  if (!ENTITY_ACTIONS[entityKind].has(actionKey)) {
    return {
      errors: [
        `${path}.key: ${key} cannot represent a ${entityKind} source record.`,
      ],
    };
  }
  if (!isRecord(raw.args)) {
    return { errors: [`${path}.args: must be an object.`] };
  }
  const registered = getWriteAction(actionKey);
  if (!registered) {
    return { errors: [`${path}.key: ${key} is no longer registered.`] };
  }
  const errors = validateSchema(
    raw.args,
    registered.input_schema,
    `${path}.args`,
  );
  if (isEmptyUpdate(actionKey, raw.args)) {
    errors.push(`${path}.args: update contains no changed fields.`);
  }
  return {
    ...(errors.length ? {} : { action: { key: actionKey, args: raw.args } }),
    errors,
  };
}

export function validateDocumentImportManifest(
  raw: unknown,
  sourceNames: string[],
  hints: DocumentSourceHint[],
  context: DocumentImportContext,
): ManifestValidationResult {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, errors: ["Manifest must be an object."] };
  }
  if (raw.contract_version !== DOCUMENT_IMPORT_CONTRACT_VERSION) {
    errors.push(
      `contract_version must be ${DOCUMENT_IMPORT_CONTRACT_VERSION}.`,
    );
  }

  const reports = Array.isArray(raw.source_reports)
    ? raw.source_reports
    : [];
  const reportNames: string[] = [];
  const parsedReports: DocumentImportManifest["source_reports"] = [];
  reports.forEach((report, index) => {
    if (!isRecord(report)) {
      errors.push(`source_reports[${index}]: must be an object.`);
      return;
    }
    if (!nonEmptyString(report.source_name)) {
      errors.push(`source_reports[${index}].source_name: is required.`);
      return;
    }
    reportNames.push(report.source_name);
    if (report.status !== "processed" && report.status !== "failed") {
      errors.push(`source_reports[${index}].status: must be processed or failed.`);
      return;
    }
    if (report.status === "failed") {
      errors.push(
        `source_reports[${index}]: ${report.source_name} was not processed.`,
      );
    }
    if (!nonEmptyString(report.summary)) {
      errors.push(`source_reports[${index}].summary: is required.`);
      return;
    }
    parsedReports.push({
      source_name: report.source_name,
      status: report.status,
      summary: report.summary,
    });
  });
  if (
    [...reportNames].sort().join("\u0000") !==
    [...sourceNames].sort().join("\u0000")
  ) {
    errors.push(
      "source_reports must contain exactly one report for every attached source.",
    );
  }

  const rawRecords = Array.isArray(raw.records) ? raw.records : [];
  const records: DocumentImportManifest["records"] = [];
  const sourceIds = new Set<string>();
  const knownSourceNames = new Set(sourceNames);

  rawRecords.forEach((record, index) => {
    const path = `records[${index}]`;
    if (!isRecord(record)) {
      errors.push(`${path}: must be an object.`);
      return;
    }
    if (!nonEmptyString(record.source_id)) {
      errors.push(`${path}.source_id: is required.`);
      return;
    }
    if (sourceIds.has(record.source_id)) {
      errors.push(`${path}.source_id: duplicate "${record.source_id}".`);
    }
    sourceIds.add(record.source_id);
    if (
      !DOCUMENT_IMPORT_ENTITY_KINDS.includes(
        record.entity_kind as DocumentImportEntityKind,
      )
    ) {
      errors.push(`${path}.entity_kind: is invalid.`);
      return;
    }
    const entityKind = record.entity_kind as DocumentImportEntityKind;
    if (
      !DOCUMENT_IMPORT_DISPOSITIONS.includes(
        record.disposition as DocumentImportManifest["records"][number]["disposition"],
      )
    ) {
      errors.push(`${path}.disposition: is invalid.`);
      return;
    }
    const disposition =
      record.disposition as DocumentImportManifest["records"][number]["disposition"];
    if (!isRecord(record.source)) {
      errors.push(`${path}.source: is required.`);
      return;
    }
    if (
      !nonEmptyString(record.source.name) ||
      !knownSourceNames.has(record.source.name)
    ) {
      errors.push(`${path}.source.name: must name an attached source.`);
      return;
    }
    if (!nonEmptyString(record.source.excerpt)) {
      errors.push(`${path}.source.excerpt: is required.`);
      return;
    }
    if (!nonEmptyString(record.reason)) {
      errors.push(`${path}.reason: is required.`);
      return;
    }
    const rawActions = Array.isArray(record.actions) ? record.actions : [];
    if (disposition === "change" && rawActions.length === 0) {
      errors.push(`${path}.actions: change records need at least one action.`);
    }
    if (disposition !== "change" && rawActions.length > 0) {
      errors.push(`${path}.actions: only change records may contain actions.`);
    }
    const actions: DocumentImportAction[] = [];
    rawActions.forEach((action, actionIndex) => {
      const result = validateAction(
        action,
        entityKind,
        `${path}.actions[${actionIndex}]`,
      );
      errors.push(...result.errors);
      if (result.action) actions.push(result.action);
    });
    records.push({
      source_id: record.source_id,
      entity_kind: entityKind,
      disposition,
      source: {
        name: record.source.name,
        ...(nonEmptyString(record.source.locator)
          ? { locator: record.source.locator }
          : {}),
        excerpt: record.source.excerpt,
      },
      reason: record.reason,
      actions,
    });
  });

  for (const hint of hints) {
    if (!hint.entityKind || hint.expectedRecords === undefined) continue;
    const actual = records.filter(
      (record) =>
        record.source.name === hint.sourceName &&
        record.entity_kind === hint.entityKind,
    ).length;
    if (actual !== hint.expectedRecords) {
      errors.push(
        `${hint.sourceName}: expected ${hint.expectedRecords} ${hint.entityKind} records from deterministic source structure, received ${actual}.`,
      );
    }
  }

  const projectIds = new Set(context.projects.map((project) => project.id));
  const projectNames = new Set(
    context.projects.map((project) => project.name.trim().toLowerCase()),
  );
  const taskIds = new Set(context.tasks.map((task) => task.id));
  const createdProjectNames = new Set<string>();
  const seenCreatedProjectNames = new Set<string>();
  const allActions = records.flatMap((record) => record.actions);
  for (const action of allActions) {
    if (action.key !== "create_project") continue;
    const name = String(action.args.name ?? "").trim().toLowerCase();
    if (projectNames.has(name)) {
      errors.push(
        `create_project "${String(action.args.name)}" already exists; reconcile it as an update or no_change.`,
      );
    }
    if (seenCreatedProjectNames.has(name)) {
      errors.push(`create_project "${String(action.args.name)}" is duplicated.`);
    }
    seenCreatedProjectNames.add(name);
    createdProjectNames.add(name);
  }
  for (const action of allActions) {
    const projectId =
      action.key === "update_project"
        ? action.args.id
        : action.args.project_id;
    if (
      typeof projectId === "string" &&
      projectId &&
      !projectIds.has(projectId)
    ) {
      errors.push(`${action.key}: project id "${projectId}" does not exist.`);
    }
    if (
      (action.key === "update_task" ||
        action.key === "update_project_state") &&
      typeof action.args.next_task_id === "string" &&
      !taskIds.has(action.args.next_task_id)
    ) {
      errors.push(
        `${action.key}: next task id "${action.args.next_task_id}" does not exist.`,
      );
    }
    if (
      action.key === "update_task" &&
      typeof action.args.id === "string" &&
      !taskIds.has(action.args.id)
    ) {
      errors.push(`update_task: task id "${action.args.id}" does not exist.`);
    }
    if (
      (action.key === "create_task" ||
        action.key === "update_project_state") &&
      nonEmptyString(action.args.project_name) &&
      !createdProjectNames.has(action.args.project_name.trim().toLowerCase())
    ) {
      errors.push(
        `${action.key}: project_name "${action.args.project_name}" must reference a create_project action in this manifest.`,
      );
    }
  }

  const actionFingerprints = new Set<string>();
  for (const action of allActions) {
    const fingerprint = JSON.stringify([action.key, action.args]);
    if (actionFingerprints.has(fingerprint)) {
      errors.push(`${action.key}: duplicate compiled action.`);
    }
    actionFingerprints.add(fingerprint);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    manifest: {
      contract_version: DOCUMENT_IMPORT_CONTRACT_VERSION,
      source_reports: parsedReports,
      records,
    },
  };
}
