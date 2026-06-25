import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProjectPipeline } from '@/components/projects/ProjectPipeline'
import type { ProjectStage } from '@/lib/validation/schemas'

interface Props {
  params: Promise<{ lang: string; id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { lang, id } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('projects')
  const supabase = await createSupabaseServerClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, stage, owner_id, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <a
          href={`/${lang}/projects`}
          className="text-sm inline-block mb-4 hover:underline underline-offset-2"
          style={{ color: 'var(--color-mute)' }}
        >
          ← {t('allProjects')}
        </a>
        <h1 className="text-3xl font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
          {project.name}
        </h1>
        {project.description && (
          <p className="text-sm" style={{ color: 'var(--color-body)' }}>
            {project.description}
          </p>
        )}
      </div>

      <section className="mb-8 pb-16" aria-labelledby="pipeline-heading" style={{ overflow: 'visible' }}>
        <h2
          id="pipeline-heading"
          className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
          style={{ color: 'var(--color-mute)' }}
        >
          {t('pipeline')}
        </h2>
        <ProjectPipeline projectId={project.id} currentStage={project.stage as ProjectStage} lang={lang} />
      </section>
    </main>
  )
}
