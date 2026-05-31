'use client'
import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Stores auth state (including PKCE verifier)
// in cookies so the server callback route can complete the exchange.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
