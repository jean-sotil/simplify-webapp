'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

export interface AnalysisResultData {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  zip_file_url?: string | null
  carpeta_digital_url?: string | null
  analysis_metadata?: Record<string, unknown> | null
  completed_at?: string | null
  error_message?: string | null
}

interface AnalysisResultsProps {
  result: AnalysisResultData | null
  projectId?: string
}

export function AnalysisResults({ result: initialResult, projectId }: AnalysisResultsProps) {
  const t = useTranslations('analysis')
  const [result, setResult] = useState<AnalysisResultData | null>(initialResult)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showUnfound, setShowUnfound] = useState(false)
  const [unfoundSearch, setUnfoundSearch] = useState('')
  const [carpetaLoading, setCarpetaLoading] = useState(false)
  const [carpetaUrl, setCarpetaUrl] = useState<string | null>(initialResult?.carpeta_digital_url ?? null)
  const [carpetaError, setCarpetaError] = useState<string | null>(null)

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
    totalRequirements?: number
    unfoundRequirements?: Array<{
      requirementId: string
      text: string
      partida: string
      partidaDesc: string
    }>
  } | null
  const docCount = metadata?.documentCount
  const totalRequirements = metadata?.totalRequirements ?? 0
  const unfoundRequirements = metadata?.unfoundRequirements ?? []
  const notFoundCount = unfoundRequirements.length
  const foundCount = totalRequirements - notFoundCount
  const compliancePercent = totalRequirements > 0
    ? ((foundCount / totalRequirements) * 100).toFixed(1)
    : '0.0'
  const completedAt = result.completed_at ? new Date(result.completed_at).toLocaleString() : null

  return (
    <div className="border rounded-md p-5" style={{ borderColor: 'var(--color-hairline)' }}>
      <h2 className="text-xs font-medium uppercase tracking-[1.5px] mb-4" style={{ color: 'var(--color-mute)' }}>
        {t('results')}
      </h2>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent-green)' }}>
          ● {t('complete')}
        </span>
        {completedAt && (
          <span className="text-xs" style={{ color: 'var(--color-mute)' }}>{completedAt}</span>
        )}
      </div>

      {/* Compliance metrics */}
      {totalRequirements > 0 && (
        <>
          {/* Compliance percentage - prominent */}
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {compliancePercent}%
            </span>
            <span className="text-sm" style={{ color: 'var(--color-mute)' }}>
              {t('compliancePercent')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full mb-4" style={{ backgroundColor: 'var(--color-hairline)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(parseFloat(compliancePercent), 100)}%`,
                backgroundColor: parseFloat(compliancePercent) >= 70 ? 'var(--color-accent-green)' : parseFloat(compliancePercent) >= 40 ? '#f59e0b' : 'var(--color-accent-red)',
              }}
            />
          </div>

          {/* Stats grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {docCount !== undefined && (
              <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
                <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('documentsCount')}</dt>
                <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{docCount}</dd>
              </div>
            )}
            <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
              <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('totalRequirements')}</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>{totalRequirements}</dd>
            </div>
            <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
              <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('requirementsFound')}</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-accent-green)' }}>{foundCount}</dd>
            </div>
            <div className="border rounded-sm p-3" style={{ borderColor: 'var(--color-hairline)' }}>
              <dt className="text-xs mb-1" style={{ color: 'var(--color-mute)' }}>{t('requirementsNotFound')}</dt>
              <dd className="text-lg font-semibold" style={{ color: 'var(--color-accent-red)' }}>{notFoundCount}</dd>
            </div>
          </dl>
        </>
      )}

      {/* Unfound requirements - simple read-only table */}
      {unfoundRequirements.length > 0 && (
        <div className="mb-5 border rounded-sm" style={{ borderColor: 'var(--color-hairline)' }}>
          <button
            type="button"
            onClick={() => setShowUnfound(!showUnfound)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ color: 'var(--color-ink)' }}
          >
            <span>{t('unfoundRequirements')} ({unfoundRequirements.length})</span>
            <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
              {showUnfound ? '▲' : '▼'}
            </span>
          </button>
          {showUnfound && (
            <div className="border-t" style={{ borderColor: 'var(--color-hairline)' }}>
              {/* Search filter */}
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-hairline)' }}>
                <input
                  type="text"
                  value={unfoundSearch}
                  onChange={e => setUnfoundSearch(e.target.value)}
                  placeholder={t('filterByIdPartidaReq')}
                  className="w-full border rounded-sm px-3 py-1.5 text-xs focus:outline-none"
                  style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-hairline)', backgroundColor: '#fafafa' }}>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>ID</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>{t('partidaCol')}</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-mute)' }}>{t('requirementCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...unfoundRequirements]
                    .sort((a, b) => {
                      const numA = parseInt(a.requirementId.replace(/\D/g, ''), 10)
                      const numB = parseInt(b.requirementId.replace(/\D/g, ''), 10)
                      return numA - numB
                    })
                    .filter(req => {
                      if (!unfoundSearch.trim()) return true
                      const q = unfoundSearch.toLowerCase()
                      return req.requirementId.toLowerCase().includes(q) ||
                        (req.partida || '').toLowerCase().includes(q) ||
                        (req.text || '').toLowerCase().includes(q)
                    })
                    .map((req) => (
                    <tr key={req.requirementId} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-hairline)' }}>
                      <td className="px-3 py-2 whitespace-nowrap font-mono" style={{ color: 'var(--color-mute)' }}>
                        {req.requirementId}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-body)' }}>
                        {req.partida || '-'}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-body)' }}>
                        {req.text || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Carpeta Digital */}
      {projectId && (
        <div className="flex items-center gap-3 flex-wrap pt-4 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
          <button
            type="button"
            disabled={carpetaLoading}
            onClick={async () => {
              setCarpetaLoading(true)
              setCarpetaError(null)
              try {
                const res = await fetch('/api/generate-carpeta-digital', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ analysisId: result.id, projectId }),
                })
                if (!res.ok) {
                  const err = await res.json()
                  throw new Error(err.error || 'Failed to generate')
                }
                const data = await res.json()
                setCarpetaUrl(data.zipUrl)
              } catch (err) {
                setCarpetaError(err instanceof Error ? err.message : 'Error')
              } finally {
                setCarpetaLoading(false)
              }
            }}
            className="inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#8b5cf6', color: 'white' }}
          >
            {carpetaLoading ? t('generatingCarpeta') : (carpetaUrl ? t('regenerateCarpeta') : t('generateCarpeta'))}
          </button>

          {carpetaUrl && (
            <a
              href={`/api/download?url=${encodeURIComponent(carpetaUrl)}`}
              download
              className="inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
            >
              {t('downloadCarpeta')}
            </a>
          )}

          {carpetaError && (
            <span className="text-xs" style={{ color: 'var(--color-accent-red)' }}>{carpetaError}</span>
          )}
        </div>
      )}
    </div>
  )
}
