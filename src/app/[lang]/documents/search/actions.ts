'use server'

import { semanticSearchDocuments, type SemanticSearchResult } from '@/lib/search/semantic'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function searchDocumentsAction(
  query: string,
  documentType?: 'ett' | 'hardware' | 'software'
): Promise<{ data?: SemanticSearchResult[]; error?: string }> {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  const supabase = await createSupabaseServerClient()

  try {
    const results = await semanticSearchDocuments(query, supabase, {
      documentType,
      limit: 10,
    })
    return { data: results }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Search failed' }
  }
}
