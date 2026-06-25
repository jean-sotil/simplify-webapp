import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'

/**
 * GET /api/project-analysis-docs?projectId=xxx
 * Returns documents selected for analysis in a project
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('project_analysis_documents')
    .select('id, document_id, added_at, documents(id, filename, document_type, original_file_url)')
    .eq('project_id', projectId)
    .order('added_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data ?? [] })
}

/**
 * POST /api/project-analysis-docs
 * Add documents to a project's analysis set
 * Body: { projectId: string, documentIds: string[] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId, documentIds } = body as { projectId: string; documentIds: string[] }

  if (!projectId || !documentIds?.length) {
    return NextResponse.json({ error: 'Missing projectId or documentIds' }, { status: 400 })
  }

  const rows = documentIds.map(docId => ({
    project_id: projectId,
    document_id: docId,
  }))

  const { error } = await supabaseAdmin
    .from('project_analysis_documents')
    .upsert(rows, { onConflict: 'project_id,document_id', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, added: documentIds.length })
}

/**
 * DELETE /api/project-analysis-docs?projectId=xxx&documentId=yyy
 * Remove a document from a project's analysis set
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const documentId = searchParams.get('documentId')

  if (!projectId || !documentId) {
    return NextResponse.json({ error: 'Missing projectId or documentId' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('project_analysis_documents')
    .delete()
    .eq('project_id', projectId)
    .eq('document_id', documentId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
