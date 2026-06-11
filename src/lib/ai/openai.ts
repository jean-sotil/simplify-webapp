import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiBaseUrl = process.env.OPENAI_BASE_URL;

if (!openaiApiKey) {
  throw new Error("Missing environment variable: OPENAI_API_KEY");
}
if (!openaiBaseUrl) {
  throw new Error("Missing environment variable: OPENAI_BASE_URL");
}

/**
 * OpenAI-compatible client pointing to OpenRouter.
 * OPENAI_BASE_URL must be https://openrouter.ai/api/v1.
 */
export const openai = new OpenAI({
  apiKey: openaiApiKey,
  baseURL: openaiBaseUrl,
});

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1536; // must match VECTOR(1536) in Supabase

/**
 * Generates a single embedding vector for the provided text.
 * Returns a number[] suitable for storing in a vector column.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate to ~8000 tokens worth of text (safe limit for text-embedding-3-large)
  const truncatedText = text.slice(0, 28_000)
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  if (!response.data?.[0]?.embedding) {
    throw new Error(`Embedding API returned no data. Response: ${JSON.stringify(response).slice(0, 200)}`)
  }
  return response.data[0].embedding;
}

/**
 * Generates embedding vectors for a batch of texts in a single API call.
 * Returns an array of number[] in the same order as the input texts.
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  // Truncate each text to safe limit
  const truncatedTexts = texts.map((t) => t.slice(0, 28_000))
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedTexts,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  if (!response.data?.length) {
    throw new Error(`Embedding batch API returned no data. Response: ${JSON.stringify(response).slice(0, 200)}`)
  }
  return response.data.map((item) => item.embedding);
}
