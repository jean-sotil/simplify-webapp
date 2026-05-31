import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    console.error('[auth/callback] No code in query string. Params:', Object.fromEntries(searchParams))
    return NextResponse.redirect(`${origin}/en/auth/signin?error=no_code`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message, error)
    return NextResponse.redirect(`${origin}/en/auth/signin?error=exchange_failed&reason=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/en/projects`)
}
