'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { triggerAnalysis } from '@/app/[lang]/projects/[id]/analysis/actions'
import { DocumentSelector, type EttDocument } from '@/components/analysis/DocumentSelector'
import type { SelectedDocument } from '@/lib/validation/schemas'

interface AnalysisTriggerProps {
  projectId: string
  ettDocuments: EttDocument[]
}

export function AnalysisTrigger({ projectId, ettDocuments }: AnalysisTriggerProps) {
  const t = useTranslations('analysis')
  const [isPending, startTransition] = useTransition()
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [triggered, setTriggered] = useState(false)
  const router = useRouter()

  // Auto-refresh the page every 5s while analysis is running
  // This will cause the server component to re-render with updated status
  useEffect(() => {
    if (!triggered) return
    const interval = setInterval(() => {
      router.refresh()
    }, 5000)
    return () => clearInterval(interval)
  }, [triggered, router])

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
    return null // Panel disappears, progress shows in the results section
  }

  return (
    <div>
      {isPending && (
        <div
          className="mb-4 p-3 rounded-sm text-sm flex items-center gap-2"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-ink)' }}
          role="status"
          aria-live="polite"
        >
          <span className="inline-block animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          {t('triggering')}
        </div>
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
        ettDocuments={ettDocuments}
        onRunAnalysis={handleRunAnalysis}
        disabled={isPending || triggered}
      />
    </div>
  )
}
