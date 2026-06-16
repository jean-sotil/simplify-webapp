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
  const router = useRouter()

  function handleRunAnalysis(selectedDocuments: SelectedDocument[]) {
    setTriggerError(null)
    startTransition(async () => {
      const result = await triggerAnalysis(projectId, selectedDocuments)
      if ('error' in result && result.error) {
        const message =
          typeof result.error === 'string'
            ? result.error
            : 'Validation failed. Check document selection.'
        setTriggerError(message)
      } else {
        setTriggered(true)
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
      {isPending && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          {t('triggering')}
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
        disabled={isPending || triggered}
      />
    </div>
  )
}
