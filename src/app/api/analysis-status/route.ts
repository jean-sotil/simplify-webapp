import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db.server'
import { getUser } from '@/lib/auth'

/**
 * GET /api/analysis-status?id=<analysisId>
 *
 * Returns the current status of an analysis, including stage log.
 * Used by the UI for real-time polling.
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('analysis_results')
    .select('id, status, zip_file_url, analysis_metadata, completed_at, error_message')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
