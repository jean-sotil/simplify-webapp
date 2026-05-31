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
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

/**
 * Generates embedding vectors for a batch of texts in a single API call.
 * Returns an array of number[] in the same order as the input texts.
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data.map((item) => item.embedding);
}
