'use server'

import { semanticSearchDocuments, type SemanticSearchResult } from '@/lib/search/semantic'
import { getUser } from '@/lib/auth'

export async function searchDocumentsAction(
  query: string,
  documentType?: 'ett' | 'hardware'
): Promise<{ data?: SemanticSearchResult[]; error?: string }> {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const results = await semanticSearchDocuments(query, user.id, {
      documentType,
      limit: 10,
    })
    return { data: results }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Search failed' }
  }
}
