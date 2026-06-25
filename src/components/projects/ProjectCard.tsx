'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ProjectStage } from '@/lib/validation/schemas'

const STAGE_STYLES: Record<ProjectStage, React.CSSProperties> = {
  initiation: {
    backgroundColor: 'var(--color-accent-blue)',
    color: 'var(--color-on-primary)',
  },
  planning: {
    backgroundColor: 'var(--color-accent-purple)',
    color: 'var(--color-on-primary)',
  },
  docs_analysis: {
    backgroundColor: 'var(--color-accent-orange)',
    color: 'var(--color-on-primary)',
  },
  sustento_letters: {
    backgroundColor: '#8b5cf6',
    color: 'var(--color-on-primary)',
  },
  development: {
    backgroundColor: 'var(--color-accent-pink)',
    color: 'var(--color-on-primary)',
  },
  deployment: {
    backgroundColor: 'var(--color-accent-yellow)',
    color: 'var(--color-ink)',
  },
  completed: {
    backgroundColor: 'var(--color-accent-green)',
    color: 'var(--color-ink)',
  },
}

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    stage: ProjectStage
    updated_at: string
  }
  lang: string
}

export function ProjectCard({ project, lang }: ProjectCardProps) {
  const t = useTranslations('projects')
  const stageLabel = t(`stages.${project.stage}`)
  const stageStyle = STAGE_STYLES[project.stage]
  const updatedAt = new Date(project.updated_at).toLocaleDateString()

  return (
    <article
      className="border rounded-md p-8 hover:shadow-md transition-shadow"
      style={{
        borderColor: 'var(--color-hairline)',
        backgroundColor: 'var(--color-canvas)',
      }}
      aria-label={`Project: ${project.name}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2
          className="text-base font-semibold leading-snug"
          style={{ color: 'var(--color-ink)' }}
        >
          {project.name}
        </h2>
        <span
          className="shrink-0 text-xs font-medium px-2 py-1 rounded-sm"
          style={stageStyle}
        >
          {stageLabel}
        </span>
      </div>

      {project.description && (
        <p
          className="text-sm mb-4 line-clamp-2"
          style={{ color: 'var(--color-body)' }}
        >
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-4">
        <time
          className="text-xs"
          dateTime={project.updated_at}
          style={{ color: 'var(--color-mute)' }}
        >
          {t('updated')} {updatedAt}
        </time>
        <Link
          href={`/${lang}/projects/${project.id}`}
          className="text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('viewDetails')} →
        </Link>
      </div>
    </article>
  )
}
