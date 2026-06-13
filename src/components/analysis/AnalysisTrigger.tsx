'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'
import { DocumentSelector, type EttDocument } from '@/components/analysis/DocumentSelector'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface AnalysisTriggerProps {
  projectId: string
  ettDocument: EttDocument
}

export function AnalysisTrigger({ projectId, ettDocument }: AnalysisTriggerProps) {
  const t = useTranslations('analysis')
  const [isPending, startTransition] = useTransition()
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState(false)
  const [useMock, setUseMock] = useState(false)
  const router = useRouter()

  function handleRunAnalysis(selectedDocuments: SelectedDocument[]) {
    setTriggerError(null)
    startTransition(async () => {
      const result = await triggerAnalysis(projectId, selectedDocuments, { mock: useMock })
      if ('error' in result && result.error) {
        const message =
          typeof result.error === 'string'
            ? result.error
            : 'Validation failed. Check document selection.'
        setTriggerError(message)
      } else {
        setTriggered(true)
        // Refresh page so AnalysisResults picks up the "processing" status
        router.refresh()
      }
    })
  }

  if (triggered) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
        {t('triggered')}
      </p>
    )
  }

  return (
    <div>
      {/* Mock toggle */}
      <div
        className="mb-4 flex items-center gap-2 p-3 rounded-sm border"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <input
          type="checkbox"
          id="mock-toggle"
          checked={useMock}
          onChange={(e) => setUseMock(e.target.checked)}
        />
        <label htmlFor="mock-toggle" className="text-sm" style={{ color: 'var(--color-mute)' }}>
          {t('mockMode')}
        </label>
      </div>

      {isPending && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          {useMock ? t('mockTriggering') : t('triggering')}
        </p>
      )}
      {triggerError && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-sm mb-4"
          style={{ color: 'var(--color-accent-red)' }}
        >
          {triggerError}
        </p>
      )}
      <DocumentSelector
        ettDocument={ettDocument}
        onRunAnalysis={handleRunAnalysis}
      />
    </div>
  )
}
