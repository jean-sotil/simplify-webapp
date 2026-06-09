import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('documents')
    .select('id, filename, document_type, uploaded_at')
    .order('uploaded_at', { ascending: false })

  if (type && (type === 'ett' || type === 'hardware')) {
    query = query.eq('document_type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documents: data ?? [] })
}
