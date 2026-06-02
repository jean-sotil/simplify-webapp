'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/db.server'
import { getUser } from '@/lib/auth'
import { SelectedDocumentSchema } from '@/lib/validation/schemas'
import { triggerN8nWorkflow } from '@/lib/n8n/client'
import { z } from 'zod'

async function requireAuth() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

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

  // Resolve the actual blob URLs from the documents table.
  // The client passes document ids; we authorise and enrich server-side so
  // clients cannot inject arbitrary URLs into the n8n payload.
  const documentIds = parsed.data.map((d) => d.id)
  const { data: documentRows, error: docsError } = await supabase
    .from('documents')
    .select('id, original_file_url')
    .in('id', documentIds)

  if (docsError || !documentRows) {
    return { error: 'Failed to resolve document URLs' }
  }

  const urlByDocumentId = new Map(documentRows.map((row) => [row.id, row.original_file_url as string]))

  const enrichedDocuments = parsed.data.map((d) => ({
    ...d,
    url: urlByDocumentId.get(d.id) ?? '',
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

  // Trigger n8n with correctly typed and URL-enriched documents
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
