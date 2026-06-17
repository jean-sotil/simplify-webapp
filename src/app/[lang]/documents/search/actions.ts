'use server'

import { getUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db.server'
import { generateEmbedding } from '@/lib/ai/openai'

export interface ChunkSearchResult {
  chunkId: string
  documentId: string
  filename: string
  documentType: string
  pageNumber: number | null
  chunkText: string
  similarity: number
}

/**
 * Searches document chunks by semantic similarity.
 * Optionally scopes to specific document IDs.
 */
export async function searchChunksAction(
  query: string,
  options?: {
    documentIds?: string[]
    documentType?: 'ett' | 'hardware' | 'software'
    limit?: number
  }
): Promise<{ data?: ChunkSearchResult[]; error?: string }> {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!query.trim()) return { error: 'Query is required' }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    const limit = options?.limit ?? 10
    const threshold = 0.25

    // If document IDs are provided, search only in those documents
    if (options?.documentIds && options.documentIds.length > 0) {
      const { data, error } = await supabaseAdmin.rpc('search_chunks_by_embedding', {
        query_embedding: queryEmbedding,
        doc_ids: options.documentIds,
        match_count: limit,
        similarity_threshold: threshold,
      })

      if (error) return { error: error.message }

      // Enrich with document info
      const docIds = [...new Set((data || []).map((r: { document_id: string }) => r.document_id))]
      const { data: docs } = await supabaseAdmin
        .from('documents')
        .select('id, filename, document_type')
        .in('id', docIds)

      const docMap = new Map((docs || []).map(d => [d.id, d]))

      const results: ChunkSearchResult[] = (data || []).map((row: {
        chunk_id: string
        document_id: string
        page_number: number | null
        chunk_text: string
        similarity: number
      }) => {
        const doc = docMap.get(row.document_id)
        return {
          chunkId: row.chunk_id,
          documentId: row.document_id,
          filename: doc?.filename ?? 'Unknown',
          documentType: doc?.document_type ?? 'hardware',
          pageNumber: row.page_number,
          chunkText: row.chunk_text,
          similarity: row.similarity,
        }
      })

      return { data: results }
    }

    // Search across all documents (with optional type filter)
    let docFilter: string[] = []
    if (options?.documentType) {
      const { data: filteredDocs } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('document_type', options.documentType)

      docFilter = (filteredDocs || []).map(d => d.id)
    } else {
      const { data: allDocs } = await supabaseAdmin
        .from('documents')
        .select('id')
        .neq('document_type', 'ett')

      docFilter = (allDocs || []).map(d => d.id)
    }

    if (docFilter.length === 0) return { data: [] }

    const { data, error } = await supabaseAdmin.rpc('search_chunks_by_embedding', {
      query_embedding: queryEmbedding,
      doc_ids: docFilter,
      match_count: limit,
      similarity_threshold: threshold,
    })

    if (error) return { error: error.message }

    // Enrich with document info
    const docIds = [...new Set((data || []).map((r: { document_id: string }) => r.document_id))]
    const { data: docs } = await supabaseAdmin
      .from('documents')
      .select('id, filename, document_type')
      .in('id', docIds)

    const docMap = new Map((docs || []).map(d => [d.id, d]))

    const results: ChunkSearchResult[] = (data || []).map((row: {
      chunk_id: string
      document_id: string
      page_number: number | null
      chunk_text: string
      similarity: number
    }) => {
      const doc = docMap.get(row.document_id)
      return {
        chunkId: row.chunk_id,
        documentId: row.document_id,
        filename: doc?.filename ?? 'Unknown',
        documentType: doc?.document_type ?? 'hardware',
        pageNumber: row.page_number,
        chunkText: row.chunk_text,
        similarity: row.similarity,
      }
    })

    return { data: results }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Search failed' }
  }
}
