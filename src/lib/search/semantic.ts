import { generateEmbedding } from '@/lib/ai/openai'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SemanticSearchResult {
  id: string
  filename: string
  document_type: string
  similarity: number
  uploaded_at: string
}

/**
 * Performs a vector similarity search using a pre-computed embedding vector.
 * Unlike `semanticSearchDocuments`, this function does not call the embedding
 * API — the caller is responsible for generating the embedding beforehand.
 * This makes it suitable for batch workflows where embeddings are produced
 * once and reused across multiple RPC calls.
 *
 * When `documentIds` is provided the results are filtered to only those
 * document IDs, scoping the search to a known subset (e.g. the hardware PDFs
 * the user explicitly selected for a given analysis run).
 *
 * The caller must pass an authenticated Supabase client so auth.uid() resolves
 * correctly in the SQL function's RLS check.
 */
export async function searchDocumentsByEmbedding(
  embedding: number[],
  client: SupabaseClient,
  options?: {
    limit?: number
    threshold?: number
    documentIds?: string[]
  },
): Promise<SemanticSearchResult[]> {
  const matchCount = options?.limit ?? 10
  const similarityThreshold = options?.threshold ?? 0

  const { data, error } = await client.rpc('search_documents_semantic', {
    query_embedding: embedding,
    team_id_param: null,
    doc_type_filter: null,
    match_count: matchCount,
  })

  if (error || !data) {
    console.error('[searchDocumentsByEmbedding] RPC error:', error)
    return []
  }

  const rawResults = (data as SemanticSearchResult[]).map((row) => ({
    ...row,
    similarity: Math.min(1, Math.max(0, row.similarity)),
  }))

  const aboveThreshold = rawResults.filter((row) => row.similarity >= similarityThreshold)

  if (!options?.documentIds || options.documentIds.length === 0) {
    return aboveThreshold
  }

  const allowedIds = new Set(options.documentIds)
  return aboveThreshold.filter((row) => allowedIds.has(row.id))
}

/**
 * Performs a vector similarity search against the documents table.
 * Caller must pass an authenticated Supabase client so auth.uid() resolves
 * correctly in the SQL function's RLS check.
 */
export async function semanticSearchDocuments(
  query: string,
  client: SupabaseClient,
  options?: {
    documentType?: 'ett' | 'hardware'
    limit?: number
  },
): Promise<SemanticSearchResult[]> {
  const limit = options?.limit ?? 10

  let embedding: number[]
  try {
    embedding = await generateEmbedding(query)
  } catch {
    return []
  }

  const { data, error } = await client.rpc('search_documents_semantic', {
    query_embedding: embedding,
    team_id_param: null,
    doc_type_filter: options?.documentType ?? null,
    match_count: limit,
  })

  if (error || !data) {
    console.error('[semanticSearchDocuments] RPC error:', error)
    return []
  }

  return (data as SemanticSearchResult[]).map((row) => ({
    ...row,
    similarity: Math.min(1, Math.max(0, row.similarity)),
  }))
}
