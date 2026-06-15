'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = createSupabaseBrowserClient()

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const { lang } = useParams<{ lang: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event which fires when the user
    // arrives from the reset email link (after the callback exchanges the code)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    // Also check if there's already a session (user arrived via callback redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    if (password !== confirmPassword) {
      setStatus('error')
      setErrorMessage(t('passwordsDoNotMatch'))
      return
    }

    if (password.length < 6) {
      setStatus('error')
      setErrorMessage(t('minChars'))
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('success')
      // Redirect to projects after a short delay
      setTimeout(() => {
        router.push(`/${lang}/projects`)
        router.refresh()
      }, 2000)
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
            {t('resetPassword')}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-mute)' }}>
            {t('resetPasswordDescription')}
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
            {t('passwordUpdated')}
          </div>
        ) : !sessionReady ? (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
              {t('verifyingLink')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="new-password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('newPassword')}
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={t('minChars')}
                minLength={6}
                className="w-full rounded-sm px-4 py-3 text-sm border focus:outline-none"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-ink)' }}
              >
                {t('confirmPassword')}
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={t('minChars')}
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
              className="w-full rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? t('updatingPassword') : t('updatePassword')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
