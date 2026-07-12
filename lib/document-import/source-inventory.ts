import type { ChatAttachment } from "@/lib/chat-attachments";
import type { DocumentSourceHint } from "@/lib/document-import/contract";

function firstMarkdownHeading(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.match(/^#\s+(.+?)\s*$/)?.[1]?.trim())
      .find(Boolean) ?? ""
  );
}

function secondLevelHeadings(text: string): number {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+\S/.test(line))
    .length;
}

function checklistItems(text: string): number {
  return text
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+\[[ xX]\]\s+\S/.test(line))
    .length;
}

/** Cheap deterministic coverage hints for structured text. They do not try to
 * understand prose; they give the manifest validator counts it can prove. */
export function inspectDocumentSources(
  attachments: ChatAttachment[],
): DocumentSourceHint[] {
  return attachments.map((attachment) => {
    if (attachment.kind !== "text") {
      return {
        sourceName: attachment.name,
        description: `${attachment.name}: binary document/image; every discovered entity must still be represented.`,
      };
    }

    const title = firstMarkdownHeading(attachment.text).toLowerCase();
    if (title === "tasks") {
      const expectedRecords = checklistItems(attachment.text);
      return {
        sourceName: attachment.name,
        entityKind: "task",
        expectedRecords,
        description: `${attachment.name}: structured task document with exactly ${expectedRecords} checklist task records.`,
      };
    }
    if (title === "projects") {
      const expectedRecords = secondLevelHeadings(attachment.text);
      return {
        sourceName: attachment.name,
        entityKind: "project",
        expectedRecords,
        description: `${attachment.name}: structured project document with exactly ${expectedRecords} level-two project records.`,
      };
    }

    return {
      sourceName: attachment.name,
      description: `${attachment.name}: text source; inventory every discovered entity.`,
    };
  });
}
