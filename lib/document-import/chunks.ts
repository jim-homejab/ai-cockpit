import type { ChatAttachment } from "@/lib/chat-attachments";
import type { DocumentEntityKind } from "@/lib/document-import/contract";

export type DocumentChunk = {
  sourceName: string;
  label: string;
  sourceIds: string[];
  sourceIdPrefix: string;
  strictCount: boolean;
  entityKind?: DocumentEntityKind;
  text?: string;
  attachment?: ChatAttachment;
};

type SourceUnit = {
  sourceId: string;
  label: string;
  text: string;
};

function groupUnits(
  sourceName: string,
  units: SourceUnit[],
  size: number,
  entityKind?: DocumentEntityKind,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  for (let index = 0; index < units.length; index += size) {
    const batch = units.slice(index, index + size);
    chunks.push({
      sourceName,
      label: `${sourceName} · ${batch[0].label}${batch.length > 1 ? ` + ${batch.length - 1}` : ""}`,
      sourceIds: batch.map((unit) => unit.sourceId),
      sourceIdPrefix: `${sourceName}#`,
      strictCount: true,
      ...(entityKind ? { entityKind } : {}),
      text: batch
        .map(
          (unit) =>
            `--- SOURCE RECORD ${unit.sourceId} (${unit.label}) ---\n${unit.text}`,
        )
        .join("\n\n"),
    });
  }
  return chunks;
}

function markdownTitle(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.match(/^#\s+(.+?)\s*$/)?.[1]?.trim())
      .find(Boolean) ?? ""
  ).toLowerCase();
}

function taskUnits(sourceName: string, text: string): SourceUnit[] {
  const lines = text.split(/\r?\n/);
  const units: SourceUnit[] = [];
  let section = "Unfiled";
  let current: { section: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const number = units.length + 1;
    units.push({
      sourceId: `${sourceName}#task-${number}`,
      label: current.section,
      text: `Project/workstream: ${current.section}\n${current.lines.join("\n")}`,
    });
    current = null;
  };
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/)?.[1]?.trim();
    if (heading) {
      flush();
      section = heading;
      continue;
    }
    if (/^\s*[-*]\s+\[[ xX]\]\s+\S/.test(line)) {
      flush();
      current = { section, lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return units;
}

function projectUnits(sourceName: string, text: string): SourceUnit[] {
  const lines = text.split(/\r?\n/);
  const units: SourceUnit[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const number = units.length + 1;
    units.push({
      sourceId: `${sourceName}#project-${number}`,
      label: current.heading,
      text: `## ${current.heading}\n${current.lines.join("\n")}`,
    });
    current = null;
  };
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/)?.[1]?.trim();
    if (heading) {
      flush();
      current = { heading, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return units;
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function csvTaskChunks(sourceName: string, text: string): DocumentChunk[] | null {
  const rows = csvRows(text);
  if (rows.length < 2) return null;
  const headers = rows[0].map((header) => header.trim());
  const taskIndex = headers.findIndex((header) =>
    ["task", "task title", "title", "to do", "todo"].includes(
      header.toLowerCase(),
    ),
  );
  if (taskIndex < 0) return null;
  const units = rows.slice(1).map((row, index): SourceUnit => {
    const title = row[taskIndex]?.trim() || `row ${index + 2}`;
    const fields = headers
      .map((header, fieldIndex) => {
        const value = row[fieldIndex]?.trim();
        return header && value ? `${header}: ${value}` : "";
      })
      .filter(Boolean)
      .join("\n");
    return {
      sourceId: `${sourceName}#row-${index + 2}`,
      label: title,
      text: fields,
    };
  });
  return groupUnits(sourceName, units, 5, "task");
}

function plainListChunks(sourceName: string, text: string): DocumentChunk[] | null {
  const units: SourceUnit[] = [];
  let section = "Unfiled";
  let current: { section: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const number = units.length + 1;
    const item = current.lines[0]
      .replace(/^\s*[-*]\s+/, "")
      .trim();
    units.push({
      sourceId: `${sourceName}#item-${number}`,
      label: `${current.section} · ${item.slice(0, 80)}`,
      text: `Workstream: ${current.section}\n${current.lines.join("\n")}`,
    });
    current = null;
  };
  for (const line of text.split(/\r?\n/)) {
    const clean = line.trim();
    if (
      clean.endsWith(":") &&
      clean.length <= 100 &&
      !/^[-*]\s+/.test(clean)
    ) {
      flush();
      section = clean.slice(0, -1).trim() || "Unfiled";
      continue;
    }
    if (/^\s{0,1}[-*]\s+\S/.test(line)) {
      flush();
      current = { section, lines: [line] };
      continue;
    }
    if (current && clean && !/^-{3,}$/.test(clean)) current.lines.push(line);
  }
  flush();
  return units.length >= 2 ? groupUnits(sourceName, units, 5) : null;
}

function genericTextChunks(sourceName: string, text: string): DocumentChunk[] {
  const maxChars = 12_000;
  const chunks: DocumentChunk[] = [];
  for (let start = 0, number = 1; start < text.length; start += maxChars, number++) {
    const prefix = `${sourceName}#chunk-${number}`;
    chunks.push({
      sourceName,
      label: `${sourceName} · part ${number}`,
      sourceIds: [],
      sourceIdPrefix: prefix,
      strictCount: false,
      text: `Use source IDs beginning with "${prefix}#".\n\n${text.slice(start, start + maxChars)}`,
    });
  }
  return chunks;
}

/** Structured Markdown gets one deterministic source unit per project/task.
 * Unknown text is bounded by size. Binary files stay one request per file. */
export function buildDocumentChunks(
  attachments: ChatAttachment[],
): DocumentChunk[] {
  return attachments.flatMap((attachment, attachmentIndex) => {
    if (attachment.kind !== "text") {
      const prefix = `${attachment.name}#file-${attachmentIndex + 1}`;
      return [
        {
          sourceName: attachment.name,
          label: attachment.name,
          sourceIds: [],
          sourceIdPrefix: prefix,
          strictCount: false,
          attachment,
        },
      ];
    }
    const title = markdownTitle(attachment.text);
    if (title === "tasks") {
      return groupUnits(
        attachment.name,
        taskUnits(attachment.name, attachment.text),
        5,
        "task",
      );
    }
    if (title === "projects") {
      return groupUnits(
        attachment.name,
        projectUnits(attachment.name, attachment.text),
        3,
        "project",
      );
    }
    if (/\.csv$/i.test(attachment.name)) {
      const csvChunks = csvTaskChunks(attachment.name, attachment.text);
      if (csvChunks) return csvChunks;
    }
    if (/\.txt$/i.test(attachment.name)) {
      const listChunks = plainListChunks(attachment.name, attachment.text);
      if (listChunks) return listChunks;
    }
    return genericTextChunks(attachment.name, attachment.text);
  });
}
