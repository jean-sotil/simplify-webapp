import 'server-only'

import { generateEmbeddingsBatch } from '@/lib/ai/openai'
import { supabaseAdmin } from '@/lib/db.server'
import { extractRequirementsFromETT } from './requirement-extraction'

interface MatchedHardwareDocument {
  documentId: string
  filename: string
  originalFileUrl: string
  similarityScore: number
}

interface TracedRequirement {
  requirementId: string
  text: string
  sourceDocumentId: string
  matchedHardwareDocuments: MatchedHardwareDocument[]
}

interface DocumentInfo {
  id: string
  filename: string
  originalFileUrl: string
  documentType: 'ett' | 'hardware'
  extractedText: string
}

/**
 * Builds a requirement-to-hardware-document trace map.
 * 
 * 1. Extracts clean requirements from ETT documents (filters noise, merges split lines)
 * 2. Generates embeddings for each requirement in batch
 * 3. Searches hardware document embeddings for matches
 * 4. Returns the trace map ready for the n8n payload
 */
export async function buildRequirementTraceMap(
  documents: DocumentInfo[],
  targetPartidaPrefix?: string
): Promise<TracedRequirement[]> {
  const ettDocs = documents.filter(d => d.documentType === 'ett')
  const hardwareDocs = documents.filter(d => d.documentType === 'hardware')

  if (ettDocs.length === 0 || hardwareDocs.length === 0) {
    return []
  }

  // Step 1: Extract requirements from all ETT documents
  const allRequirements = ettDocs.flatMap(doc =>
    extractRequirementsFromETT(doc.extractedText, doc.id, targetPartidaPrefix)
  )

  if (allRequirements.length === 0) {
    console.warn('[buildRequirementTraceMap] No requirements extracted from ETT documents')
    return []
  }

  // Step 2: Generate embeddings for all requirements in one batch call
  let embeddings: number[][]
  try {
    embeddings = await generateEmbeddingsBatch(allRequirements.map(r => r.text))
  } catch (err) {
    console.warn('[buildRequirementTraceMap] Embedding generation failed:', err)
    // Return requirements without matches rather than failing completely
    return allRequirements.map(r => ({
      requirementId: r.requirementId,
      text: r.text,
      sourceDocumentId: r.sourceDocumentId,
      matchedHardwareDocuments: [],
    }))
  }

  // Step 3: For each requirement, search for matching hardware documents
  const hardwareDocIds = hardwareDocs.map(d => d.id)
  const SIMILARITY_THRESHOLD = 0.60 // slightly lower than 0.65 to catch more matches
  const TOP_K = 3

  const tracedRequirements: TracedRequirement[] = await Promise.all(
    allRequirements.map(async (req, idx) => {
      const embedding = embeddings[idx]

      try {
        // Use RPC to search by embedding vector
        const { data, error } = await supabaseAdmin.rpc('search_documents_by_embedding', {
          query_embedding: embedding,
          doc_ids: hardwareDocIds,
          match_count: TOP_K,
          similarity_threshold: SIMILARITY_THRESHOLD,
        })

        if (error || !data || data.length === 0) {
          return {
            requirementId: req.requirementId,
            text: req.text,
            sourceDocumentId: req.sourceDocumentId,
            matchedHardwareDocuments: [],
          }
        }

        // Map results to the expected shape
        const matches: MatchedHardwareDocument[] = data.map((row: {
          id: string
          filename: string
          similarity: number
        }) => {
          const hwDoc = hardwareDocs.find(d => d.id === row.id)
          return {
            documentId: row.id,
            filename: row.filename,
            originalFileUrl: hwDoc?.originalFileUrl ?? '',
            similarityScore: Math.min(1, Math.max(0, row.similarity)),
          }
        })

        return {
          requirementId: req.requirementId,
          text: req.text,
          sourceDocumentId: req.sourceDocumentId,
          matchedHardwareDocuments: matches,
        }
      } catch {
        return {
          requirementId: req.requirementId,
          text: req.text,
          sourceDocumentId: req.sourceDocumentId,
          matchedHardwareDocuments: [],
        }
      }
    })
  )

  return tracedRequirements
}
