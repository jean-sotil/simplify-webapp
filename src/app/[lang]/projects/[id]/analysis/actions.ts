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

  // Validate selected documents
  const parsed = z.array(SelectedDocumentSchema).min(1, 'Select at least one document.').safeParse(selectedDocuments)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  // Verify project ownership
  const supabase = await createSupabaseServerClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, team_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  // Insert analysis_results row
  const { data: analysis, error: insertError } = await supabaseAdmin
    .from('analysis_results')
    .insert({
      project_id: projectId,
      selected_documents: parsed.data,
      status: 'processing',
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  await supabase.from('projects').update({ metadata: { analysis_results_id: analysis.id } }).eq('id', projectId)

  // Trigger n8n
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await triggerN8nWorkflow({
      projectId,
      projectName: project.name,
      analysisId: analysis.id,
      selectedDocuments: parsed.data.map(d => ({
        id: d.id,
        filename: d.filename,
        originalFileUrl: d.url,
        documentType: 'ett',
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
