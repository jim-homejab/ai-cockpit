// Split KB prose into passages for embedding. Semantic search works best over
// passage-sized chunks rather than whole documents, so we pack paragraphs up to
// a soft size limit and hard-split any single oversized paragraph.

const MAX_CHARS = 1500;

export function chunkText(text: string, maxChars = MAX_CHARS): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      flush();
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push(para.slice(i, i + maxChars));
      }
      continue;
    }
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length > maxChars) {
      flush();
      current = para;
    } else {
      current = candidate;
    }
  }
  flush();

  return chunks;
}
