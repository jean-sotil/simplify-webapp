'use client'

import { useTransition } from 'react'
import { updateProjectStage } from '@/app/[lang]/projects/actions'
import type { ProjectStage } from '@/lib/validation/schemas'

const STAGES: { value: ProjectStage; label: string }[] = [
  { value: 'initiation', label: 'Initiation' },
  { value: 'planning', label: 'Planning' },
  { value: 'docs_analysis', label: 'Docs Analysis' },
  { value: 'development', label: 'Development' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'completed', label: 'Completed' },
]

interface ProjectPipelineProps {
  projectId: string
  currentStage: ProjectStage
}

export function ProjectPipeline({ projectId, currentStage }: ProjectPipelineProps) {
  const [isPending, startTransition] = useTransition()
  const currentIndex = STAGES.findIndex(s => s.value === currentStage)

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
          const isCurrent = stage.value === currentStage

          return (
            <li key={stage.value} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStageClick(stage.value)}
                disabled={isPending}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${stage.label}${isCurrent ? ' (current stage)' : isCompleted ? ' (completed)' : ''}`}
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
                {stage.label}
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
