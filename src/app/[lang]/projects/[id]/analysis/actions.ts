// Force recompile: 2026-06-15T22:00
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/db.server'
import { getUser } from '@/lib/auth'
import { SelectedDocumentSchema, type TracedRequirement, type MatchedHardwareDocument } from '@/lib/validation/schemas'
import { generateEmbeddingsBatch } from '@/lib/ai/openai'
import { extractRequirementsFromETT } from '@/lib/analysis/requirement-extraction'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

async function requireAuth() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

// ---------------------------------------------------------------------------
// buildRequirementTraceMap
// ---------------------------------------------------------------------------

/**
 * Builds a requirement-to-hardware-document trace map by:
 *   1. Using intelligent extraction to get clean requirements from ETT text
 *      (filters headers, page numbers, merges split lines)
 *   2. Embedding all candidates in a single batch API call.
 *   3. Running a scoped semantic search per candidate against the provided
 *      hardware document IDs.
 *
 * Returns an empty array on any error so the caller can proceed without
 * enrichment rather than blocking the analysis.
 */
async function buildRequirementTraceMap(
  ettDocuments: Array<{ id: string; extractedText: string }>,
  hardwareDocumentIds: string[],
  _supabase: SupabaseClient,
): Promise<TracedRequirement[]> {
  try {
    // Step 1: extract clean requirements using intelligent extraction
    // Filters noise (headers, page numbers), merges multi-line specs,
    // only processes content from the target section (06.11 - Control de Acceso)
    const requirementCandidates: Array<{ sourceDocumentId: string; text: string; requirementId: string }> = []

    for (const ettDoc of ettDocuments) {
      const extracted = extractRequirementsFromETT(ettDoc.extractedText, ettDoc.id, '06.11')
      console.log(`[buildRequirementTraceMap] ETT ${ettDoc.id.substring(0,8)}: extracted ${extracted.length} requirements from ${ettDoc.extractedText.length} chars`)
      for (const req of extracted) {
        requirementCandidates.push({
          sourceDocumentId: req.sourceDocumentId,
          text: req.text,
          requirementId: req.requirementId,
        })
      }
    }

    console.log(`[buildRequirementTraceMap] Total requirements: ${requirementCandidates.length}`)
    if (requirementCandidates.length === 0) {
      return []
    }

    // Step 2: embed all candidates in a single batch call.
    const requirementTexts = requirementCandidates.map((c) => c.text)
    const embeddings = await generateEmbeddingsBatch(requirementTexts)

    // Step 3: for each embedding, search in document CHUNKS (not whole-document embeddings)
    // This provides much better similarity scores because chunks are shorter and more focused.
    // Note: threshold is low because ETT requirements are in Spanish while hardware docs are in English
    const SIMILARITY_THRESHOLD = 0.30
    const MATCH_COUNT = 3

    const searchPromises = embeddings.map(async (embedding) => {
      const { data, error } = await supabaseAdmin.rpc('search_chunks_by_embedding_grouped', {
        query_embedding: embedding,
        doc_ids: hardwareDocumentIds,
        match_count: MATCH_COUNT,
        similarity_threshold: SIMILARITY_THRESHOLD,
      })

      if (error || !data) {
        console.warn('[buildRequirementTraceMap] RPC error:', error)
        return []
      }

      return (data as Array<{ document_id: string; filename: string; document_type: string; page_number: number | null; chunk_text: string; similarity: number }>).map((row) => ({
        id: row.document_id,
        filename: row.filename,
        document_type: row.document_type,
        similarity: Math.min(1, Math.max(0, row.similarity)),
        page_number: row.page_number,
        uploaded_at: '',
      }))
    })

    const searchResultsPerRequirement = await Promise.all(searchPromises)

    // Step 4: assemble the TracedRequirement array.
    const tracedRequirements: TracedRequirement[] = requirementCandidates.map((candidate, index) => {
      const matchedHardwareDocuments: MatchedHardwareDocument[] = searchResultsPerRequirement[index].map((result) => ({
        documentId: result.id,
        filename: result.filename,
        originalFileUrl: '',
        similarityScore: result.similarity,
        pageNumber: result.page_number ?? undefined,
      }))

      return {
        requirementId: candidate.requirementId,
        text: candidate.text,
        sourceDocumentId: candidate.sourceDocumentId,
        matchedHardwareDocuments,
      }
    })

    return tracedRequirements
  } catch (err) {
    console.warn('[buildRequirementTraceMap] Enrichment failed — dispatching without requirements:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// triggerAnalysis
// ---------------------------------------------------------------------------

export async function triggerAnalysis(projectId: string, selectedDocuments: unknown[]) {
  const user = await requireAuth()

  // Validate selected documents shape
  const parsed = z.array(SelectedDocumentSchema).min(1, 'Select at least one document.').safeParse(selectedDocuments)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  // Verify project ownership via RLS-enforced client
  const supabase = await createSupabaseServerClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, team_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  // Resolve blob URLs and extracted text from the documents table.
  const documentIds = parsed.data.map((d) => d.id)
  const { data: documentRows, error: docsError } = await supabase
    .from('documents')
    .select('id, filename, original_file_url, extracted_text, document_type')
    .in('id', documentIds)

  if (docsError || !documentRows) {
    return { error: 'Failed to resolve document URLs' }
  }

  const urlByDocumentId = new Map(documentRows.map((row) => [row.id, row.original_file_url as string]))

  const enrichedDocuments = parsed.data.map((d) => ({
    ...d,
    url: urlByDocumentId.get(d.id) ?? '',
    documentType: (documentRows.find(r => r.id === d.id)?.document_type as string) ?? 'hardware',
  }))

  // Build the requirement trace map using ETT extracted text and the list of
  // hardware + software document IDs (all non-ETT selected documents).
  const ettDocumentRows = documentRows.filter((row) => row.document_type === 'ett')
  const compareDocumentIds = documentRows
    .filter((row) => row.document_type === 'hardware' || row.document_type === 'software')
    .map((row) => row.id as string)

  const ettDocsForTracing = ettDocumentRows.map((row) => ({
    id: row.id as string,
    extractedText: (row.extracted_text as string | null) ?? '',
  }))

  const requirements = await buildRequirementTraceMap(ettDocsForTracing, compareDocumentIds, supabase)

  // Clean up previous sustento_links when re-running analysis
  // (requirements may change, so old sustento links become invalid)
  await supabaseAdmin
    .from('sustento_links')
    .delete()
    .eq('project_id', projectId)

  // Upsert analysis_results row (allows re-running analysis for same project)
  const { data: analysis, error: insertError } = await supabaseAdmin
    .from('analysis_results')
    .upsert({
      project_id: projectId,
      selected_documents: enrichedDocuments,
      status: 'processing',
      error_message: null,
      zip_file_url: null,
      analysis_carpeta_digital_url: null,
      sustento_carpeta_digital_url: null,
      analysis_metadata: null,
      completed_at: null,
      triggered_at: new Date().toISOString(),
    }, { onConflict: 'project_id' })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Merge analysis_results_id into existing metadata (preserve llmConfig etc.)
  const { data: existingProject } = await supabase.from('projects').select('metadata').eq('id', projectId).single()
  const existingMetadata = (existingProject?.metadata ?? {}) as Record<string, unknown>
  await supabase.from('projects').update({ metadata: { ...existingMetadata, analysis_results_id: analysis.id } }).eq('id', projectId)

  // Trigger document analysis in the background (fire-and-forget)
  // The /api/analyze-documents endpoint processes all docs, calls LLM,
  // and updates analysis_results when done.
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Build documents array — send ALL requirements to EACH hardware/software document
    // Let the LLM decide which requirements each document satisfies
    const allRequirements = requirements.map(req => ({
      requirementId: req.requirementId,
      text: req.text,
      pageNumber: null,
      similarityScore: 0,
    }))

    const documents = enrichedDocuments
      .filter(d => d.documentType === 'hardware' || d.documentType === 'software')
      .map(doc => ({
        documentId: doc.id,
        filename: doc.filename,
        originalFileUrl: doc.url,
        documentType: doc.documentType,
        matchedRequirements: allRequirements,
      }))

    // Fire-and-forget: start analysis in background, don't block UI
    // The AnalysisResults component polls every 5s to show progress
    fetch(`${appUrl}/api/analyze-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents,
        analysisId: analysis.id,
        projectId,
        ettText: ettDocsForTracing[0]?.extractedText ?? '',
      }),
    }).catch((err) => {
      console.error('[triggerAnalysis] Background analysis call failed:', err)
    })
  } catch (err) {
    await supabaseAdmin
      .from('analysis_results')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', analysis.id)
    return { error: err instanceof Error ? err.message : 'Failed to trigger analysis' }
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: project.team_id,
    action: 'triggered',
    resource_type: 'analysis',
    resource_id: analysis.id,
  })

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')
  return { data: analysis }
}
