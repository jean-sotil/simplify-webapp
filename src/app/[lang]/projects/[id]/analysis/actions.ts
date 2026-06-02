'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/db.server'
import { getUser } from '@/lib/auth'
import { SelectedDocumentSchema, type TracedRequirement, type MatchedHardwareDocument } from '@/lib/validation/schemas'
import { triggerN8nWorkflow } from '@/lib/n8n/client'
import { generateEmbeddingsBatch } from '@/lib/ai/openai'
import { searchDocumentsByEmbedding } from '@/lib/search/semantic'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

async function requireAuth() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

// ---------------------------------------------------------------------------
// Requirement extraction helpers
// ---------------------------------------------------------------------------

/**
 * Splits a raw ETT document text into candidate requirement chunks.
 * A chunk qualifies if it is at least 60 characters long.
 * Splitting strategy: double-newlines first, then single newlines that
 * precede an uppercase letter or a common requirement pattern keyword
 * (REQ, a number, or a bullet character).
 */
function extractRequirementCandidates(extractedText: string): string[] {
  const requirementPatternPrefix = /\n(?=[A-Z]|REQ|\d+[\.\)]|[•\-\*])/g

  const paragraphs = extractedText
    .split(/\n\n+/)
    .flatMap((paragraph) => paragraph.split(requirementPatternPrefix))
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 60)

  return paragraphs
}

/**
 * Formats a zero-padded requirement identifier for a given sequential index.
 * Index is 0-based; output is 1-based (e.g. index 0 → "REQ-001").
 */
function formatRequirementId(index: number): string {
  return `REQ-${String(index + 1).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// buildRequirementTraceMap
// ---------------------------------------------------------------------------

/**
 * Builds a requirement-to-hardware-document trace map by:
 *   1. Chunking extracted ETT text into requirement candidates.
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
  supabase: SupabaseClient,
): Promise<TracedRequirement[]> {
  try {
    // Step 1: extract all requirement candidates across every ETT document.
    const requirementCandidates: Array<{ sourceDocumentId: string; text: string }> = []

    for (const ettDoc of ettDocuments) {
      const chunks = extractRequirementCandidates(ettDoc.extractedText)
      for (const chunk of chunks) {
        requirementCandidates.push({ sourceDocumentId: ettDoc.id, text: chunk })
      }
    }

    if (requirementCandidates.length === 0) {
      return []
    }

    // Step 2: embed all candidates in a single batch call.
    const requirementTexts = requirementCandidates.map((c) => c.text)
    const embeddings = await generateEmbeddingsBatch(requirementTexts)

    // Step 3: for each embedding, run a scoped similarity search restricted
    // to the hardware documents selected for this analysis run.
    const searchPromises = embeddings.map((embedding) =>
      searchDocumentsByEmbedding(embedding, supabase, {
        limit: 3,
        threshold: 0.65,
        documentIds: hardwareDocumentIds,
      }),
    )

    const searchResultsPerRequirement = await Promise.all(searchPromises)

    // Step 4: assemble the TracedRequirement array.
    const tracedRequirements: TracedRequirement[] = requirementCandidates.map((candidate, index) => {
      const matchedHardwareDocuments: MatchedHardwareDocument[] = searchResultsPerRequirement[index].map((result) => ({
        documentId: result.id,
        filename: result.filename,
        originalFileUrl: '',
        similarityScore: result.similarity,
      }))

      return {
        requirementId: formatRequirementId(index),
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

  // Enforce business rule: at least one ETT document must be present
  const hasEttDocument = parsed.data.some((d) => d.documentType === 'ett')
  if (!hasEttDocument) {
    return { error: 'Analysis requires at least one ETT document.' }
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
  // The client passes document ids; we authorise and enrich server-side so
  // clients cannot inject arbitrary URLs into the n8n payload.
  // extracted_text is fetched here to avoid a second round-trip later.
  const documentIds = parsed.data.map((d) => d.id)
  const { data: documentRows, error: docsError } = await supabase
    .from('documents')
    .select('id, original_file_url, extracted_text, document_type')
    .in('id', documentIds)

  if (docsError || !documentRows) {
    return { error: 'Failed to resolve document URLs' }
  }

  const urlByDocumentId = new Map(documentRows.map((row) => [row.id, row.original_file_url as string]))

  const enrichedDocuments = parsed.data.map((d) => ({
    ...d,
    url: urlByDocumentId.get(d.id) ?? '',
  }))

  // Build the requirement trace map using ETT extracted text and the list of
  // hardware document IDs.  This is best-effort; failure returns [] and the
  // analysis proceeds without enrichment.
  const ettDocumentRows = documentRows.filter((row) => row.document_type === 'ett')
  const hardwareDocumentIds = documentRows
    .filter((row) => row.document_type === 'hardware')
    .map((row) => row.id as string)

  const ettDocsForTracing = ettDocumentRows.map((row) => ({
    id: row.id as string,
    extractedText: (row.extracted_text as string | null) ?? '',
  }))

  const requirements = await buildRequirementTraceMap(ettDocsForTracing, hardwareDocumentIds, supabase)

  // Enrich matched hardware document URLs from the resolved URL map so n8n
  // receives fully-resolved Vercel Blob URLs in the requirements array.
  const requirementsWithUrls = requirements.map((req) => ({
    ...req,
    matchedHardwareDocuments: req.matchedHardwareDocuments.map((match) => ({
      ...match,
      originalFileUrl: urlByDocumentId.get(match.documentId) ?? '',
    })),
  }))

  // Upsert analysis_results row (allows re-running analysis for same project)
  const { data: analysis, error: insertError } = await supabaseAdmin
    .from('analysis_results')
    .upsert({
      project_id: projectId,
      selected_documents: enrichedDocuments,
      status: 'processing',
      error_message: null,
      zip_file_url: null,
      analysis_metadata: null,
      completed_at: null,
      triggered_at: new Date().toISOString(),
    }, { onConflict: 'project_id' })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  await supabase.from('projects').update({ metadata: { analysis_results_id: analysis.id } }).eq('id', projectId)

  // Trigger n8n with correctly typed, URL-enriched documents and the
  // pre-computed requirement trace map.
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    await triggerN8nWorkflow({
      projectId,
      projectName: project.name,
      analysisId: analysis.id,
      selectedDocuments: enrichedDocuments.map((d) => ({
        id: d.id,
        filename: d.filename,
        originalFileUrl: d.url,
        documentType: d.documentType,
      })),
      webhookUrl: `${appUrl}/api/webhooks/n8n`,
      requirements: requirementsWithUrls,
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
