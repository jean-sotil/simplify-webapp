import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProjectCard } from '@/components/projects/ProjectCard'

export async function generateMetadata(_props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return {
    title: 'Projects',
    alternates: { languages: { en: '/en/projects', es: '/es/proyectos' } },
  }
}

interface Props {
  params: Promise<{ lang: string }>
}

export default async function ProjectsPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('projects')
  const supabase = await createSupabaseServerClient()

  // Admin sees all projects; normal user sees only their own
  const { isAdmin } = await import('@/lib/roles')
  const userIsAdmin = await isAdmin()

  const query = userIsAdmin
    ? supabase.from('projects').select('id, name, description, stage, owner_id, updated_at, created_at').order('updated_at', { ascending: false })
    : supabase.from('projects').select('id, name, description, stage, owner_id, updated_at, created_at').eq('owner_id', user.id).order('updated_at', { ascending: false })

  const { data: projects, error } = await query

  if (error) throw new Error(error.message)

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
          >
            {t('title')}
          </p>
          <h1
            className="text-4xl font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            {t('yourProjects')}
          </h1>
        </div>
        <a
          href={`/${lang}/projects/new`}
          className="text-sm font-medium px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
          }}
        >
          {t('newProject')}
        </a>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} lang={lang} />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-16 border rounded-md"
          style={{ borderColor: 'var(--color-hairline)' }}
        >
          <p style={{ color: 'var(--color-mute)' }} className="text-sm">
            {t('noProjects')}
          </p>
          <a
            href={`/${lang}/projects/new`}
            className="mt-4 inline-block text-sm font-medium px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
            }}
          >
            {t('createFirst')}
          </a>
        </div>
      )}
    </main>
  )
}
