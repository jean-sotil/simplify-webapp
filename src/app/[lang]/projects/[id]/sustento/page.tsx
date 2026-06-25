import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { SustentoWorkspace } from '@/components/analysis/SustentoWorkspace'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ lang: string; id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Support Letters' }
}

export default async function ProjectSustentoPage({ params }: Props) {
  const { lang, id } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('sustento')
  const supabase = await createSupabaseServerClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  // Get the latest completed analysis
  const { data: analysis } = await supabase
    .from('analysis_results')
    .select('id, status, analysis_metadata, completed_at, analysis_carpeta_digital_url, sustento_carpeta_digital_url')
    .eq('project_id', id)
    .eq('status', 'completed')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4 text-sm">
        <a
          href={`/${lang}/projects/${id}/analysis`}
          className="hover:underline"
          style={{ color: 'var(--color-mute)' }}
        >
          ← {t('prevStage')}
        </a>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-body)' }}>
          {t('subtitle')}
        </p>
      </div>

      {!analysis ? (
        <div
          className="border rounded-md p-8 text-center"
          style={{ borderColor: 'var(--color-accent-yellow)' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
            {t('noAnalysis')}
          </p>
          <a
            href={`/${lang}/projects/${id}/analysis`}
            className="inline-block rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {t('goToAnalysis')}
          </a>
        </div>
      ) : (
        <SustentoWorkspace
          projectId={id}
          projectName={project.name}
          analysisId={analysis.id}
          analysisMetadata={analysis.analysis_metadata as Record<string, unknown> | null}
          analysisCompletedAt={(analysis as { completed_at?: string }).completed_at || null}
          initialCarpetaUrl={(analysis as { sustento_carpeta_digital_url?: string }).sustento_carpeta_digital_url || null}
          lang={lang}
        />
      )}
    </main>
  )
}
