import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { DocumentSelector } from '@/components/analysis/DocumentSelector'
import { AnalysisResults, type AnalysisResultData } from '@/components/analysis/AnalysisResults'
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

  const supabase = await createSupabaseServerClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, team_id')
    .eq('id', id)
    .single()

  if (error || !project) notFound()

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
        ← {project.name}
      </a>

      <div className="mb-8">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Analysis
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          Document Analysis
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section aria-labelledby="results-label">
          <h2
            id="results-label"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
            style={{ color: 'var(--color-mute)' }}
          >
            Results
          </h2>
          <AnalysisResults result={analysis as AnalysisResultData | null} />
        </section>

        <section aria-labelledby="selector-label">
          <h2
            id="selector-label"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
            style={{ color: 'var(--color-mute)' }}
          >
            Select documents
          </h2>
          <DocumentSelector />
        </section>
      </div>
    </main>
  )
}
