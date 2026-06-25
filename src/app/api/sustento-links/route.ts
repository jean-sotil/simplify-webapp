import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'

/**
 * GET /api/sustento-links?projectId=xxx
 * Returns all sustento links for a project
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('sustento_links')
    .select('id, document_id, requirement_ids, created_at, documents(id, filename)')
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ links: data ?? [] })
}

/**
 * POST /api/sustento-links
 * Links a sustento document to specific requirements
 * Body: { analysisId, projectId, documentId, requirementIds: string[] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { analysisId, projectId, documentId, requirementIds } = body as {
    analysisId: string
    projectId: string
    documentId: string
    requirementIds: string[]
  }

  if (!analysisId || !projectId || !documentId || !requirementIds?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Upsert: if this document is already linked to this project, update requirement_ids
  const { data: existing } = await supabaseAdmin
    .from('sustento_links')
    .select('id, requirement_ids')
    .eq('project_id', projectId)
    .eq('document_id', documentId)
    .maybeSingle()

  if (existing) {
    // Merge requirement_ids (avoid duplicates)
    const merged = [...new Set([...existing.requirement_ids, ...requirementIds])]
    const { error } = await supabaseAdmin
      .from('sustento_links')
      .update({ requirement_ids: merged })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, merged: true })
  }

  // Insert new
  const { error } = await supabaseAdmin
    .from('sustento_links')
    .insert({
      analysis_id: analysisId,
      project_id: projectId,
      document_id: documentId,
      requirement_ids: requirementIds,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/sustento-links?id=xxx
 * Remove a sustento link
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('sustento_links')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

/**
 * PATCH /api/sustento-links
 * Update requirement_ids for a specific sustento link
 * Body: { id: string, requirementIds: string[] }
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, requirementIds } = body as { id: string; requirementIds: string[] }

  if (!id || !requirementIds) {
    return NextResponse.json({ error: 'Missing id or requirementIds' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('sustento_links')
    .update({ requirement_ids: requirementIds })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
