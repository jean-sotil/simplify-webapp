'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Handles Supabase implicit-flow magic links. The access_token arrives in the
// URL hash (#access_token=...) which is browser-only — never reaches the server.
// createBrowserClient with detectSessionInUrl:true parses it automatically;
// we just wait for SIGNED_IN and redirect.
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe()
        router.replace('/en/projects')
      }
    })

    // In case the session was already established before the listener attached
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        router.replace('/en/projects')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-canvas)' }}
    >
      <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
        Signing you in…
      </p>
    </main>
  )
}
