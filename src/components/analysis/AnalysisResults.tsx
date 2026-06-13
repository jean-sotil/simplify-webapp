'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

export interface AnalysisResultData {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  zip_file_url?: string | null
  analysis_metadata?: Record<string, unknown> | null
  completed_at?: string | null
  error_message?: string | null
}

interface AnalysisResultsProps {
  result: AnalysisResultData | null
}

export function AnalysisResults({ result: initialResult }: AnalysisResultsProps) {
  const t = useTranslations('analysis')
  const [result, setResult] = useState<AnalysisResultData | null>(initialResult)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const scrollToBottom = useCallback(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [])

  // Auto-scroll log to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll) scrollToBottom()
  })

  function handleLogScroll() {
    if (!logRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = logRef.current
    // If user scrolled up more than 30px from bottom, disable auto-scroll
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 30)
  }

  // Poll for updates when processing
  useEffect(() => {
    if (result?.status === 'processing' || result?.status === 'pending') {
      timerRef.current = setInterval(async () => {
        if (!result?.id) return
        try {
          const res = await fetch(`/api/analysis-status?id=${result.id}`)
          if (res.ok) {
            const data = await res.json()
            setResult(data)
            if (data.status === 'completed' || data.status === 'failed') {
              if (timerRef.current) clearInterval(timerRef.current)
            }
          }
        } catch { /* ignore polling errors */ }
      }, 2000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [result?.status, result?.id])

  // Update when parent passes new initial result
  useEffect(() => {
    if (initialResult) setResult(initialResult)
  }, [initialResult])

  if (!result) {
    return (
      <div className="border rounded-md p-8 text-center" style={{ borderColor: 'var(--color-hairline)' }}>
        <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
          {t('noAnalysis')}
        </p>
      </div>
    )
  }

  if (result.status === 'pending' || result.status === 'processing') {
    const metadata = result.analysis_metadata as {
      stage?: string
      stageLog?: Array<{ time: string; message: string }>
    } | null
    const stage = metadata?.stage
    const stageLog = metadata?.stageLog || []

    return (
      <div
        className="border rounded-md p-6"
        style={{ borderColor: 'var(--color-hairline)' }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--color-hairline)', borderTopColor: 'var(--color-primary)' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {t('inProgress')}
          </p>
        </div>

        {stage && (
          <p className="text-sm ml-7 mb-3 font-medium" style={{ color: 'var(--color-ink)' }}>
            {stage}
          </p>
        )}

        {/* Stage log - shows all processing steps */}
        {stageLog.length > 0 && (
          <div className="ml-7 relative">
            <div
              ref={logRef}
              onScroll={handleLogScroll}
              className="max-h-48 overflow-y-auto border rounded-sm p-3 font-mono text-xs"
              style={{ borderColor: 'var(--color-hairline)', backgroundColor: '#fafafa' }}
            >
              {stageLog.map((entry, i) => (
                <p key={i} className="py-0.5 flex gap-2" style={{ color: 'var(--color-body)' }}>
                  <span className="shrink-0 opacity-50">
                    {new Date(entry.time).toLocaleTimeString()}
                  </span>
                  <span>{entry.message}</span>
                </p>
              ))}
            </div>
            {!autoScroll && (
              <button
                type="button"
                onClick={() => { setAutoScroll(true); scrollToBottom() }}
                className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-sm border bg-white hover:opacity-70"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
              >
                ↓ {t('latestBtn')}
              </button>
            )}
          </div>
        )}

        <p className="mt-3 ml-7 text-xs" style={{ color: 'var(--color-mute)' }}>
          {t('polling')}
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
          {t('failed')}
        </p>
        {result.error_message && (
          <p className="text-xs" style={{ color: 'var(--color-body)' }}>{result.error_message}</p>
        )}
      </div>
    )
  }

  // Completed
  const metadata = result.analysis_metadata as {
    documentCount?: number
    totalAnnotations?: number
  } | null
  const docCount = metadata?.documentCount
  const annotationCount = metadata?.totalAnnotations
  const completedAt = result.completed_at ? new Date(result.completed_at).toLocaleString() : null

  return (
    <div className="border rounded-md p-6" style={{ borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent-green)' }}>
          ● {t('complete')}
        </span>
        {completedAt && (
          <span className="text-xs" style={{ color: 'var(--color-mute)' }}>{completedAt}</span>
        )}
      </div>

      {(docCount !== undefined || annotationCount !== undefined) && (
        <dl className="flex gap-6 mb-4">
          {docCount !== undefined && (
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-mute)' }}>{t('documentsCount')}</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{docCount}</dd>
            </div>
          )}
          {annotationCount !== undefined && (
            <div>
              <dt className="text-xs" style={{ color: 'var(--color-mute)' }}>{t('annotationsFound')}</dt>
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
          {t('downloadResults')}
        </a>
      )}
    </div>
  )
}
