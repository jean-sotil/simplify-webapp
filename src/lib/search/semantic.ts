import { supabase } from '@/lib/db'
import { generateEmbedding } from '@/lib/ai/openai'

export interface SemanticSearchResult {
  id: string
  filename: string
  document_type: string
  similarity: number
  uploaded_at: string
}

/**
 * Performs a vector similarity search against the documents table.
 * Returns results ranked by cosine similarity, highest first.
 * Returns an empty array on any failure so callers can gracefully degrade.
 */
export async function semanticSearchDocuments(
  query: string,
  teamId: string,
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

  const { data, error } = await supabase.rpc('search_documents_semantic', {
    query_embedding: embedding,
    team_id_param: teamId,
    doc_type_filter: options?.documentType ?? null,
    match_count: limit,
  })

  if (error || !data) return []

  return (data as SemanticSearchResult[]).map((row) => ({
    ...row,
    similarity: Math.min(1, Math.max(0, row.similarity)),
  }))
}
