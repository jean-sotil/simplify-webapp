import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ProjectStage } from '@/lib/validation/schemas'

export const metadata: Metadata = { title: 'Dashboard' }

interface Props {
  params: Promise<{ lang: string }>
}

const STAGE_LABELS: Record<ProjectStage, string> = {
  initiation: 'Initiation',
  planning: 'Planning',
  docs_analysis: 'Docs Analysis',
  sustento_letters: 'Sustento Letters',
  development: 'Development',
  deployment: 'Deployment',
  completed: 'Completed',
}

const STAGE_ACCENT: Record<ProjectStage, string> = {
  initiation: 'var(--color-accent-blue)',
  planning: 'var(--color-accent-purple)',
  docs_analysis: 'var(--color-accent-orange)',
  sustento_letters: '#8b5cf6',
  development: 'var(--color-accent-pink)',
  deployment: 'var(--color-accent-yellow)',
  completed: 'var(--color-accent-green)',
}

export default async function DashboardPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('dashboard')
  const supabase = await createSupabaseServerClient()

  // Check if user is admin
  let userIsAdmin = false
  try {
    const { isAdmin } = await import('@/lib/roles')
    userIsAdmin = await isAdmin()
  } catch {
    // If roles check fails, default to normal user
  }

  // Admin sees all projects; normal user sees only their own
  const projectsQuery = userIsAdmin
    ? supabase.from('projects').select('stage')
    : supabase.from('projects').select('stage').eq('owner_id', user.id)

  const [projectsRes, documentsRes, analysisRes] = await Promise.all([
    projectsQuery,
    supabase.from('documents').select('id, document_type'),
    supabase.from('analysis_results').select('status').eq('status', 'completed'),
  ])

  const projects = projectsRes.data ?? []
  const documents = documentsRes.data ?? []
  const completedAnalyses = analysisRes.data?.length ?? 0

  // Group projects by stage
  const byStage = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1
    return acc
  }, {})

  const ettCount = documents.filter(d => d.document_type === 'ett').length
  const hardwareCount = documents.filter(d => d.document_type === 'hardware').length
  const softwareCount = documents.filter(d => d.document_type === 'software').length
  const sustentoCount = documents.filter(d => d.document_type === 'sustento').length

  const summaryCards = [
    { label: t('totalProjects'), value: projects.length, accent: 'var(--color-accent-blue)' },
    { label: t('documents'), value: documents.length, accent: 'var(--color-accent-purple)' },
    { label: t('completedAnalyses'), value: completedAnalyses, accent: 'var(--color-accent-green)' },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          {t('title')}
        </p>
        <h1 className="text-4xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('overview')}
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {summaryCards.map(card => (
          <div
            key={card.label}
            className="border rounded-md p-6"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
              style={{ color: 'var(--color-mute)' }}
            >
              {card.label}
            </p>
            <p className="text-4xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Projects by stage */}
      {projects.length > 0 && (
        <section className="mb-10" aria-labelledby="stage-heading">
          <h2
            id="stage-heading"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
            style={{ color: 'var(--color-mute)' }}
          >
            {t('projectsByStage')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(Object.keys(STAGE_LABELS) as ProjectStage[]).map(stage => (
              <div
                key={stage}
                className="rounded-md p-4 text-center"
                style={{
                  backgroundColor: STAGE_ACCENT[stage],
                  opacity: byStage[stage] ? 1 : 0.25,
                }}
              >
                <p className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
                  {byStage[stage] ?? 0}
                </p>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>
                  {STAGE_LABELS[stage]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Document breakdown */}
      <section className="mb-10" aria-labelledby="docs-breakdown-heading">
        <h2
          id="docs-breakdown-heading"
          className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          {t('documentLibrary')}
        </h2>
        <div className="flex gap-4 w-1/2">
          {[
            { label: t('ettSpecs'), value: ettCount, color: 'var(--color-accent-blue)' },
            { label: t('hardware'), value: hardwareCount, color: 'var(--color-accent-orange)' },
            { label: t('software'), value: softwareCount, color: '#059669' },
            { label: t('sustento'), value: sustentoCount, color: '#8b5cf6' },
          ].map(item => (
            <div
              key={item.label}
              className="border rounded-md p-4 flex-1"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              <p className="text-xs" style={{ color: 'var(--color-mute)' }}>{item.label}</p>
              <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--color-ink)' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <div className="flex gap-3">
        <a
          href={`/${lang}/projects`}
          className="rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          {t('viewProjects')}
        </a>
        <a
          href={`/${lang}/documents`}
          className="rounded-sm px-5 py-3 text-sm font-medium border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          {t('viewDocuments')}
        </a>
      </div>
    </main>
  )
}
