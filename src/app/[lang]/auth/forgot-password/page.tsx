'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = createSupabaseBrowserClient()

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const { lang } = useParams<{ lang: string }>()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('success')
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
            {t('forgotPassword')}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-mute)' }}>
            {t('forgotPasswordDescription')}
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
            }}
          >
            {t('resetEmailSent')}
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
                name="email"
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
              {status === 'loading' ? t('sendingResetEmail') : t('sendResetEmail')}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--color-mute)' }}>
              <a
                href={`/${lang}/auth/signin`}
                className="underline hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                {t('backToSignIn')}
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
