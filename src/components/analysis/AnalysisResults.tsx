'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface AnalysisResultData {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  zip_file_url?: string | null
  analysis_metadata?: {
    document_count?: number
    documentCount?: number
    total_pages?: number
    totalAnnotations?: number
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
  const router = useRouter()

  const refresh = useCallback(() => {
    if (onRefresh) {
      onRefresh()
    } else {
      router.refresh()
    }
  }, [onRefresh, router])

  useEffect(() => {
    if (result?.status === 'processing' || result?.status === 'pending') {
      timerRef.current = setTimeout(() => refresh(), 5_000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [result?.status, refresh])

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
    const stage = (result.analysis_metadata as { stage?: string } | null)?.stage
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
        {stage && (
          <p className="text-xs ml-7" style={{ color: 'var(--color-mute)' }}>
            {stage}
          </p>
        )}
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
  const docCount = result.analysis_metadata?.documentCount ?? result.analysis_metadata?.document_count
  const annotationCount = result.analysis_metadata?.totalAnnotations ?? result.analysis_metadata?.total_pages
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

      {(docCount !== undefined || annotationCount !== undefined) && (
        <dl className="flex gap-6 mb-4">
          {docCount !== undefined && (
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-mute)' }}>Documents</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{docCount}</dd>
            </div>
          )}
          {annotationCount !== undefined && (
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-mute)' }}>Annotations found</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{annotationCount}</dd>
            </div>
          )}
        </dl>
      )}

      {result.zip_file_url && (
        <a
          href={`/api/download?url=${encodeURIComponent(result.zip_file_url)}`}
          download
          className="inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          Download results (ZIP)
        </a>
      )}
    </div>
  )
}
