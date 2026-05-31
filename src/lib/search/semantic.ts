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
