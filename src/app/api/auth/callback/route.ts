import { type NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/en/projects`)
    }
  }

  return NextResponse.redirect(`${origin}/en/auth/signin?error=auth_failed`)
}
