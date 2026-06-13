'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateProjectStage } from '@/app/[lang]/projects/actions'
import type { ProjectStage } from '@/lib/validation/schemas'

const STAGES: ProjectStage[] = [
  'initiation',
  'planning',
  'docs_analysis',
  'development',
  'deployment',
  'completed',
]

interface ProjectPipelineProps {
  projectId: string
  currentStage: ProjectStage
}

export function ProjectPipeline({ projectId, currentStage }: ProjectPipelineProps) {
  const t = useTranslations('projects.stages')
  const [isPending, startTransition] = useTransition()
  const currentIndex = STAGES.findIndex(s => s === currentStage)

  function handleStageClick(stage: ProjectStage) {
    if (stage === currentStage) return
    startTransition(async () => {
      await updateProjectStage(projectId, stage)
    })
  }

  return (
    <nav aria-label="Project pipeline stages">
      <ol className="flex items-center overflow-x-auto gap-0 flex-wrap gap-y-2">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = stage === currentStage
          const label = t(stage)

          return (
            <li key={stage} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStageClick(stage)}
                disabled={isPending}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${label}${isCurrent ? ' (current)' : ''}`}
                className={[
                  'px-4 py-2 text-sm font-medium rounded-sm transition-colors',
                  isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                ].join(' ')}
                style={
                  isCurrent
                    ? {
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-on-primary)',
                      }
                    : isCompleted
                    ? {
                        backgroundColor: 'var(--color-hairline)',
                        color: 'var(--color-body)',
                      }
                    : {
                        color: 'var(--color-mute)',
                        border: '1px solid var(--color-hairline)',
                      }
                }
              >
                {label}
              </button>
              {index < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mx-1 text-sm"
                  style={{ color: 'var(--color-hairline)' }}
                >
                  →
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
