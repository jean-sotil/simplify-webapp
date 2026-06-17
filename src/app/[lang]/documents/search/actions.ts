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
    threshold?: number
  }
): Promise<{ data?: ChunkSearchResult[]; error?: string }> {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!query.trim()) return { error: 'Query is required' }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    const limit = options?.limit ?? 8
    const threshold = options?.threshold ?? 0.45

    // Determine which documents to search
    let docFilter: string[] = []
    if (options?.documentIds && options.documentIds.length > 0) {
      docFilter = options.documentIds
    } else {
      const { data: allDocs } = await supabaseAdmin
        .from('documents')
        .select('id')
        .neq('document_type', 'ett')
      docFilter = (allDocs || []).map(d => d.id)
    }

    if (docFilter.length === 0) return { data: [] }

    // Hybrid search: text match + semantic search in parallel
    const [textResults, semanticResults] = await Promise.all([
      // Pass 1: Exact text search (ILIKE) — catches literal matches
      supabaseAdmin
        .from('document_chunks')
        .select('id, document_id, page_number, chunk_text')
        .in('document_id', docFilter)
        .ilike('chunk_text', `%${query.replace(/%/g, '')}%`)
        .limit(limit),

      // Pass 2: Semantic search (embeddings) — catches meaning matches
      supabaseAdmin.rpc('search_chunks_by_embedding', {
        query_embedding: queryEmbedding,
        doc_ids: docFilter,
        match_count: limit,
        similarity_threshold: threshold,
      }),
    ])

    // Merge results: text matches first (score 1.0), then semantic (by similarity)
    const seen = new Set<string>()
    const mergedResults: Array<{ chunk_id: string; document_id: string; page_number: number | null; chunk_text: string; similarity: number }> = []

    // Add text matches with high similarity score
    for (const row of (textResults.data || [])) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        mergedResults.push({ chunk_id: row.id, document_id: row.document_id, page_number: row.page_number, chunk_text: row.chunk_text, similarity: 0.99 })
      }
    }

    // Add semantic matches (skip duplicates)
    for (const row of (semanticResults.data || [])) {
      if (!seen.has(row.chunk_id)) {
        seen.add(row.chunk_id)
        mergedResults.push(row)
      }
    }

    // Limit to requested count
    const finalResults = mergedResults.slice(0, limit)

    // Enrich with document info
    const docIds = [...new Set(finalResults.map(r => r.document_id))]
    const { data: docs } = await supabaseAdmin
      .from('documents')
      .select('id, filename, document_type')
      .in('id', docIds)

    const docMap = new Map((docs || []).map(d => [d.id, d]))

    const results: ChunkSearchResult[] = finalResults.map(row => {
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
