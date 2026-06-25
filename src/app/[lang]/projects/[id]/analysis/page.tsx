import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AnalysisWorkspace } from '@/components/analysis/AnalysisWorkspace'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ lang: string; id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Analysis' }
}

export default async function ProjectAnalysisPage({ params }: Props) {
  const { lang, id } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('analysis')
  const supabase = await createSupabaseServerClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  // Get ETT documents attached to this project
  const { data: projectDocRows } = await supabase
    .from('project_documents')
    .select('document_id, documents(id, filename, document_type, original_file_url)')
    .eq('project_id', id)

  const attachedDocs = (projectDocRows ?? []).flatMap(row => {
    if (!row.documents) return []
    return Array.isArray(row.documents) ? row.documents : [row.documents]
  })

  const ettDocuments = attachedDocs.filter(d => d.document_type === 'ett')

  // Get latest analysis result
  const { data: analysis } = await supabase
    .from('analysis_results')
    .select('id, status, zip_file_url, analysis_carpeta_digital_url, sustento_carpeta_digital_url, analysis_metadata, completed_at, error_message')
    .eq('project_id', id)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <a
          href={`/${lang}/projects/${id}`}
          className="text-sm hover:underline"
          style={{ color: 'var(--color-mute)' }}
        >
          &larr; {project.name}
        </a>
        <a
          href={`/${lang}/projects/${id}/sustento`}
          className="text-sm hover:underline"
          style={{ color: 'var(--color-mute)' }}
        >
          {t('nextStage')} →
        </a>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-body)' }}>
          {t('pageDescription')}
        </p>
      </div>

      <AnalysisWorkspace
        projectId={id}
        projectName={project.name}
        ettDocuments={ettDocuments.map(d => ({ id: d.id, filename: d.filename, url: d.original_file_url }))}
        initialAnalysis={analysis as {
          id: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          zip_file_url?: string | null
          analysis_carpeta_digital_url?: string | null
          sustento_carpeta_digital_url?: string | null
          analysis_metadata?: Record<string, unknown> | null
          completed_at?: string | null
          error_message?: string | null
        } | null}
        lang={lang}
      />
    </main>
  )
}
