'use server'

import { revalidatePath } from 'next/cache'
import { supabase, supabaseAdmin } from '@/lib/db'
import { getUser } from '@/lib/auth'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectStageSchema,
} from '@/lib/validation/schemas'

async function requireAuth() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

async function writeAuditLog(
  userId: string,
  teamId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId,
    team_id: teamId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: metadata ?? {},
  })
}

export async function createProject(formData: FormData) {
  const user = await requireAuth()

  const raw = {
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    teamId: formData.get('teamId'),
    stage: formData.get('stage') ?? 'initiation',
    metadata: {},
  }

  const parsed = CreateProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { data } = parsed
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      description: data.description,
      team_id: data.teamId,
      stage: data.stage,
      owner_id: user.id,
      metadata: data.metadata,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await writeAuditLog(user.id, data.teamId, 'created', 'project', project.id)
  revalidatePath('/[lang]/projects', 'page')
  return { data: project }
}

export async function updateProject(id: string, formData: FormData) {
  const user = await requireAuth()

  const raw: Record<string, unknown> = {}
  const name = formData.get('name')
  const description = formData.get('description')
  if (name !== null) raw.name = name
  if (description !== null) raw.description = description

  const parsed = UpdateProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await writeAuditLog(user.id, project.team_id, 'updated', 'project', id)
  revalidatePath('/[lang]/projects', 'page')
  revalidatePath(`/[lang]/projects/${id}`, 'page')
  return { data: project }
}

export async function updateProjectStage(id: string, stage: string) {
  const user = await requireAuth()

  const parsed = ProjectStageSchema.safeParse(stage)
  if (!parsed.success) return { error: 'Invalid stage value' }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ stage: parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await writeAuditLog(user.id, project.team_id, 'stage_changed', 'project', id, {
    stage: parsed.data,
  })
  revalidatePath(`/[lang]/projects/${id}`, 'page')
  return { data: project }
}

export async function deleteProject(id: string) {
  const user = await requireAuth()

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: error.message }

  await writeAuditLog(user.id, project.team_id, 'deleted', 'project', id)
  revalidatePath('/[lang]/projects', 'page')
  return { success: true }
}
