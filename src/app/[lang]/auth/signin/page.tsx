'use client'

import { useState } from 'react'
import { supabase } from '@/lib/db'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('success')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16"
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
            Sign in
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-body)' }}>
            Enter your email address and we&apos;ll send you a magic link.
          </p>
        </div>

        {status === 'success' ? (
          <div
            role="status"
            aria-live="polite"
            className="border rounded-sm px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--color-accent-green)',
              color: 'var(--color-ink)',
              backgroundColor: 'var(--color-canvas)',
            }}
          >
            Check your email for a magic link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-describedby={status === 'error' ? 'email-error' : undefined}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-sm px-4 py-3 text-sm focus:outline-none"
                style={{
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-ink)',
                  backgroundColor: 'var(--color-canvas)',
                  boxShadow: 'none',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--color-hairline)'
                }}
              />
              {status === 'error' && (
                <p
                  id="email-error"
                  role="alert"
                  aria-live="assertive"
                  className="mt-1 text-xs"
                  style={{ color: 'var(--color-accent-red)' }}
                >
                  {errorMessage}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
