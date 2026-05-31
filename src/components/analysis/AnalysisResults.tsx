'use client'

import { useEffect, useRef } from 'react'

export interface AnalysisResultData {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  zip_file_url?: string | null
  analysis_metadata?: {
    document_count?: number
    total_pages?: number
  } | null
  completed_at?: string | null
  error_message?: string | null
}

interface AnalysisResultsProps {
  result: AnalysisResultData | null
  onRefresh?: () => void
}

export function AnalysisResults({ result, onRefresh }: AnalysisResultsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (result?.status === 'processing' || result?.status === 'pending') {
      timerRef.current = setTimeout(() => onRefresh?.(), 5_000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [result?.status, onRefresh])

  if (!result) {
    return (
      <div className="border rounded-md p-8 text-center" style={{ borderColor: 'var(--color-hairline)' }}>
        <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
          No analysis has been run yet. Select documents below and click Run Analysis.
        </p>
      </div>
    )
  }

  if (result.status === 'pending' || result.status === 'processing') {
    return (
      <div
        className="border rounded-md p-8"
        style={{ borderColor: 'var(--color-hairline)' }}
        role="status"
        aria-live="polite"
        aria-label="Analysis in progress"
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--color-hairline)', borderTopColor: 'var(--color-primary)' }}
            aria-hidden="true"
          />
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            Analysis in progress…
          </p>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-hairline)', animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--color-mute)' }}>
          This page refreshes automatically every 5 seconds.
        </p>
      </div>
    )
  }

  if (result.status === 'failed') {
    return (
      <div
        className="border rounded-md p-6"
        style={{ borderColor: 'var(--color-accent-red)' }}
        role="alert"
      >
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-accent-red)' }}>
          Analysis failed
        </p>
        {result.error_message && (
          <p className="text-xs" style={{ color: 'var(--color-body)' }}>{result.error_message}</p>
        )}
      </div>
    )
  }

  // Completed
  const docCount = result.analysis_metadata?.document_count
  const pageCount = result.analysis_metadata?.total_pages
  const completedAt = result.completed_at ? new Date(result.completed_at).toLocaleString() : null

  return (
    <div className="border rounded-md p-6" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent-green)' }}>
          ● Analysis complete
        </span>
        {completedAt && (
          <span className="text-xs" style={{ color: 'var(--color-mute)' }}>{completedAt}</span>
        )}
      </div>

      {(docCount !== undefined || pageCount !== undefined) && (
        <dl className="flex gap-6 mb-4">
          {docCount !== undefined && (
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-mute)' }}>Documents</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{docCount}</dd>
            </div>
          )}
          {pageCount !== undefined && (
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-mute)' }}>Pages annotated</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{pageCount}</dd>
            </div>
          )}
        </dl>
      )}

      {result.zip_file_url && (
        <a
          href={result.zip_file_url}
          download
          className="inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          Download annotated PDFs (ZIP)
        </a>
      )}
    </div>
  )
}
