import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AnalysisTrigger } from '@/components/analysis/AnalysisTrigger'
import { AnalysisResults, type AnalysisResultData } from '@/components/analysis/AnalysisResults'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ lang: string; id: string }>
}

interface AttachedDocumentRow {
  document_id: string
  documents: {
    id: string
    filename: string
    document_type: string
    original_file_url: string
  } | {
    id: string
    filename: string
    document_type: string
    original_file_url: string
  }[] | null
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
    .select(`
      id, name, team_id,
      project_documents (
        document_id,
        documents (id, filename, document_type, original_file_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  // Flatten the nested join result into a usable list of attached documents
  const projectDocRows = (project.project_documents as AttachedDocumentRow[] | null) ?? []
  const attachedDocuments = projectDocRows.flatMap((row) => {
    if (!row.documents) return []
    return Array.isArray(row.documents) ? row.documents : [row.documents]
  })

  // An ETT document is required before analysis can proceed
  const ettDocument = attachedDocuments.find((d) => d.document_type === 'ett') ?? null

  const { data: analysis } = await supabase
    .from('analysis_results')
    .select('id, status, zip_file_url, analysis_metadata, completed_at, error_message')
    .eq('project_id', id)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main id="main-content" className="max-w-6xl mx-auto px-4 py-8">
      <a
        href={`/${lang}/projects/${id}`}
        className="text-sm hover:underline mb-4 inline-block"
        style={{ color: 'var(--color-mute)' }}
      >
        &larr; {project.name}
      </a>

      <div className="mb-8">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          {t('title')}
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('title')}
        </h1>
      </div>

      {ettDocument === null ? (
        // Gate: block analysis when no ETT is attached
        <div
          className="border rounded-md p-8 text-center"
          style={{ borderColor: 'var(--color-accent-yellow)' }}
          role="alert"
        >
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
            {t('ettRequired')}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-body)' }}>
            {t('ettRequiredDesc')}
          </p>
          <a
            href={`/${lang}/projects/${id}`}
            className="inline-block rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            &larr; {t('backToProject')}
          </a>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${analysis?.status === 'processing' ? '' : 'lg:grid-cols-2'} gap-8`}>
          <section aria-labelledby="results-label">
            <h2
              id="results-label"
              className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
              style={{ color: 'var(--color-mute)' }}
            >
              {t('results')}
            </h2>
            <AnalysisResults result={analysis as AnalysisResultData | null} />
          </section>

          {analysis?.status !== 'processing' && (
          <section aria-labelledby="selector-label">
            <h2
              id="selector-label"
              className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
              style={{ color: 'var(--color-mute)' }}
            >
              {t('selectDocuments')}
            </h2>
            <AnalysisTrigger
              projectId={id}
              ettDocument={{
                id: ettDocument.id,
                filename: ettDocument.filename,
                url: ettDocument.original_file_url,
              }}
            />
          </section>
          )}
        </div>
      )}
    </main>
  )
}
