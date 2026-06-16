'use client'

import { useState } from 'react'
import { DocumentSelector } from './DocumentSelector'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface AnalysisRunnerProps {
  projectId: string
}

export function AnalysisRunner({ projectId }: AnalysisRunnerProps) {
  const [status, setStatus] = useState<'idle' | 'triggering' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleRunAnalysis(selected: SelectedDocument[]) {
    setStatus('triggering')
    setErrorMessage('')

    const result = await triggerAnalysis(projectId, selected)

    if (result.error) {
      setStatus('error')
      setErrorMessage(typeof result.error === 'string' ? result.error : 'Validation failed')
    } else {
      setStatus('success')
    }
  }

  return (
    <div>
      {status === 'triggering' && (
        <div
          className="mb-4 p-3 rounded-sm text-sm"
          style={{ backgroundColor: 'var(--color-accent-blue)', color: 'white', opacity: 0.9 }}
        >
          Running analysis... This may take a few minutes.
        </div>
      )}

      {status === 'success' && (
        <div
          className="mb-4 p-3 rounded-sm text-sm"
          style={{ backgroundColor: 'var(--color-accent-green)', color: 'var(--color-ink)' }}
        >
          Analysis triggered successfully. Results will appear when processing completes.
        </div>
      )}

      {status === 'error' && (
        <div
          className="mb-4 p-3 rounded-sm text-sm"
          style={{ backgroundColor: 'var(--color-accent-red)', color: 'white' }}
        >
          Error: {errorMessage}
        </div>
      )}

      <DocumentSelector onRunAnalysis={handleRunAnalysis} />
    </div>
  )
}
