'use client'

import { useState, useTransition } from 'react'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'
import { DocumentSelector, type EttDocument } from '@/components/analysis/DocumentSelector'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface AnalysisTriggerProps {
  projectId: string
  ettDocument: EttDocument
}

export function AnalysisTrigger({ projectId, ettDocument }: AnalysisTriggerProps) {
  const [isPending, startTransition] = useTransition()
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState(false)

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
      }
    })
  }

  if (triggered) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-body)' }}>
        Analysis triggered. Results will appear on the left once complete.
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
          Triggering analysis…
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
