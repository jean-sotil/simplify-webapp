'use client'

import { useTransition, useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateProjectStage } from '@/app/[lang]/projects/actions'
import type { ProjectStage } from '@/lib/validation/schemas'

const STAGES: ProjectStage[] = [
  'initiation',
  'planning',
  'docs_analysis',
  'sustento_letters',
  'development',
  'deployment',
  'completed',
]

// Stages that have their own page/workspace
const STAGE_ROUTES: Partial<Record<ProjectStage, string>> = {
  docs_analysis: 'analysis',
  sustento_letters: 'sustento',
}

interface ProjectPipelineProps {
  projectId: string
  currentStage: ProjectStage
  lang?: string
}

export function ProjectPipeline({ projectId, currentStage, lang = 'es' }: ProjectPipelineProps) {
  const t = useTranslations('projects.stages')
  const [isPending, startTransition] = useTransition()
  const [hoveredStage, setHoveredStage] = useState<ProjectStage | null>(null)
  const currentIndex = STAGES.findIndex(s => s === currentStage)

  function handleSetStage(stage: ProjectStage) {
    if (stage === currentStage) return
    startTransition(async () => {
      await updateProjectStage(projectId, stage)
    })
    setHoveredStage(null)
  }

  function getStageUrl(stage: ProjectStage): string | null {
    const route = STAGE_ROUTES[stage]
    if (!route) return null
    return `/${lang}/projects/${projectId}/${route}`
  }

  return (
    <nav aria-label="Project pipeline stages" className="relative" style={{ overflow: 'visible' }}>
      <ol className="flex items-center gap-0 flex-wrap gap-y-2" style={{ overflow: 'visible' }}>
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = stage === currentStage
          const label = t(stage)
          const stageUrl = getStageUrl(stage)

          return (
            <li key={stage} className="flex items-center relative">
              <div
                className="relative"
                onMouseEnter={() => setHoveredStage(stage)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (stageUrl) {
                      window.location.href = stageUrl
                    } else {
                      handleSetStage(stage)
                    }
                  }}
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

                {/* Hover dropdown with 2 options */}
                {hoveredStage === stage && (stageUrl || !isCurrent) && (
                  <div
                    className="absolute top-full left-0 mt-1 z-10 bg-white border rounded-sm shadow-lg py-1 min-w-[160px]"
                    style={{ borderColor: 'var(--color-hairline)' }}
                  >
                    {stageUrl && (
                      <a
                        href={stageUrl}
                        className="block px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        📂 {t('openStage')}
                      </a>
                    )}
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSetStage(stage)}
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        ✓ {t('markAsCurrent')}
                      </button>
                    )}
                  </div>
                )}
              </div>

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
