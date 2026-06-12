'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = createSupabaseBrowserClient()

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      } else {
        router.push('/en/projects')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      } else {
        setStatus('success')
      }
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--color-canvas)' }}
    >
      <div
        className="w-full max-w-md border rounded-md p-8"
        style={{
          borderColor: 'var(--color-hairline)',
          backgroundColor: 'var(--color-canvas)',
        }}
      >
        <div className="mb-8">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
          >
            Simplify
          </p>
          <h1
            className="text-3xl font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
        </div>

        {status === 'success' && mode === 'signup' ? (
          <div
            role="status"
            aria-live="polite"
            className="border rounded-sm px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--color-accent-green)',
              color: 'var(--color-ink)',
            }}
          >
            Account created. Check your email to confirm, then sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-sm px-4 py-3 text-sm border focus:outline-none"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signup' ? 'Min 6 characters' : ''}
                minLength={6}
                className="w-full rounded-sm px-4 py-3 text-sm border focus:outline-none"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              />
            </div>

            {status === 'error' && (
              <p
                role="alert"
                aria-live="assertive"
                className="mb-4 text-xs"
                style={{ color: 'var(--color-accent-red)' }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mb-4"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
              aria-busy={status === 'loading'}
            >
              {status === 'loading'
                ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
                : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--color-mute)' }}>
              {mode === 'signin' ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setStatus('idle'); setErrorMessage('') }}
                    className="underline hover:opacity-70"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setStatus('idle'); setErrorMessage('') }}
                    className="underline hover:opacity-70"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
