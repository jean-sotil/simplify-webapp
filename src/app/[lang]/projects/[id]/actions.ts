'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/db'
import { supabaseAdmin } from '@/lib/db.server'
import { getUser } from '@/lib/auth'

async function requireAuth() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function attachDocumentToProject(projectId: string, documentId: string) {
  const user = await requireAuth()

  const { data: project } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', projectId)
    .single()

  // Use upsert with onConflict to silently ignore duplicates
  const { error } = await supabase
    .from('project_documents')
    .upsert(
      { project_id: projectId, document_id: documentId },
      { onConflict: 'project_id,document_id', ignoreDuplicates: true }
    )

  if (error) return { error: error.message }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: project?.team_id,
    action: 'attached',
    resource_type: 'project_document',
    resource_id: documentId,
    metadata: { project_id: projectId },
  })

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')
  return { success: true }
}

export async function detachDocumentFromProject(projectId: string, documentId: string) {
  const user = await requireAuth()

  const { data: project } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', projectId)
    .single()

  const { error } = await supabase
    .from('project_documents')
    .delete()
    .eq('project_id', projectId)
    .eq('document_id', documentId)

  if (error) return { error: error.message }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    team_id: project?.team_id,
    action: 'detached',
    resource_type: 'project_document',
    resource_id: documentId,
    metadata: { project_id: projectId },
  })

  revalidatePath(`/[lang]/projects/${projectId}`, 'page')
  return { success: true }
}
