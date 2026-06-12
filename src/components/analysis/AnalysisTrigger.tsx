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
  const [useMock, setUseMock] = useState(false)

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
      }
    })
  }

  if (triggered) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-body)' }}>
        Analysis triggered{useMock ? ' (mock)' : ''}. Results will appear on the left once complete.
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
          Mock mode (skip LLM, return fake results instantly)
        </label>
      </div>

      {isPending && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          {useMock ? 'Running mock analysis...' : 'Running analysis (this may take a few minutes)...'}
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
