import type { Metadata } from 'next'
import { supabase } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
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

  // For POC: fetch projects where owner_id = user.id (team_id TBD after teams provisioning)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description, stage, owner_id, updated_at, created_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
          >
            Projects
          </p>
          <h1
            className="text-4xl font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            Your Projects
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
          New project
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
            No projects yet.
          </p>
          <a
            href={`/${lang}/projects/new`}
            className="mt-4 inline-block text-sm font-medium px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
            }}
          >
            Create your first project
          </a>
        </div>
      )}
    </main>
  )
}
