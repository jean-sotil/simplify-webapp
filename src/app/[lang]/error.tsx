'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LocaleError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[error boundary]', error)
  }, [error])

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Error
        </p>
        <h1
          className="text-2xl font-semibold mb-3"
          style={{ color: 'var(--color-ink)' }}
        >
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-body)' }}>
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
