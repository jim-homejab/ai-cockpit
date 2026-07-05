// Voyage AI embeddings client.
//
// Anthropic has no first-party embeddings API and recommends Voyage AI, so the
// KB's semantic search is powered by Voyage. voyage-3.5 emits 1024-dim vectors,
// matching the kb_chunks.embedding column. `input_type` should be "document"
// when embedding stored content and "query" when embedding a search query —
// Voyage tunes the embedding for each role.

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5";

/** Embedding dimension — must match the kb_chunks.embedding vector size. */
export const EMBED_DIM = 1024;

export type VoyageInputType = "query" | "document";

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
};

function apiKey(): string | undefined {
  return process.env.VOYAGE_API_KEY || process.env.VOYAGEAI_API_KEY;
}

/** Embed a batch of texts, returning vectors in the same order as `texts`. */
export async function embedTexts(
  texts: string[],
  inputType: VoyageInputType,
): Promise<number[][]> {
  const key = apiKey();
  if (!key) throw new Error("VOYAGE_API_KEY is not set.");
  if (texts.length === 0) return [];

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: MODEL,
      input_type: inputType,
      output_dimension: EMBED_DIM,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Voyage error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as VoyageResponse;
  // The API may return results out of order; sort by the echoed index.
  return data.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed a single text. */
export async function embedOne(
  text: string,
  inputType: VoyageInputType,
): Promise<number[]> {
  const [embedding] = await embedTexts([text], inputType);
  return embedding;
}

/** pgvector wants its literal as a bracketed string, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return JSON.stringify(embedding);
}
