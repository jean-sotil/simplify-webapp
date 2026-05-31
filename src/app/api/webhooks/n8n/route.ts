import { type NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { supabaseAdmin } from '@/lib/db.server'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { analysisId, projectId, status, zipFileUrl, analysisMetadata, errorMessage } = body as {
    analysisId?: string
    projectId?: string
    status?: string
    zipFileUrl?: string
    analysisMetadata?: unknown
    errorMessage?: string
  }

  if (!analysisId || !projectId) {
    return NextResponse.json({ error: 'analysisId and projectId are required' }, { status: 400 })
  }

  if (status === 'completed') {
    await supabaseAdmin.from('analysis_results').update({
      status: 'completed',
      zip_file_url: zipFileUrl ?? null,
      analysis_metadata: analysisMetadata ?? null,
      completed_at: new Date().toISOString(),
    }).eq('id', analysisId)
  } else if (status === 'failed') {
    await supabaseAdmin.from('analysis_results').update({
      status: 'failed',
      error_message: errorMessage ?? 'Unknown error from n8n',
    }).eq('id', analysisId)
  }

  revalidateTag(`project-${projectId}`)
  return NextResponse.json({ success: true })
}
