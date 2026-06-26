import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'

/**
 * GET /api/llm-config?projectId=xxx
 * Returns the LLM config for a project from projects.metadata.llmConfig
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('metadata')
    .eq('id', projectId)
    .single()

  const metadata = (project?.metadata ?? {}) as Record<string, unknown>
  return NextResponse.json({ config: metadata.llmConfig ?? null })
}

/**
 * POST /api/llm-config
 * Saves LLM config to projects.metadata.llmConfig
 * Body: { projectId, config: LlmConfig }
 */
export async function POST(request: NextRequest) {
  const { projectId, config } = await request.json()
  if (!projectId || !config) {
    return NextResponse.json({ error: 'Missing projectId or config' }, { status: 400 })
  }

  // Read current metadata
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('metadata')
    .eq('id', projectId)
    .single()

  const currentMetadata = (project?.metadata ?? {}) as Record<string, unknown>
  const updatedMetadata = { ...currentMetadata, llmConfig: config }

  await supabaseAdmin
    .from('projects')
    .update({ metadata: updatedMetadata })
    .eq('id', projectId)

  return NextResponse.json({ success: true })
}
