import type { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProjectForm } from '@/components/projects/ProjectForm'

export const metadata: Metadata = { title: 'New project' }

interface Props {
  params: Promise<{ lang: string }>
}

export default async function NewProjectPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <a
          href={`/${lang}/projects`}
          className="text-sm hover:underline mb-4 inline-block"
          style={{ color: 'var(--color-mute)' }}
        >
          ← All projects
        </a>
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Projects
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          New project
        </h1>
      </div>

      <div
        className="border rounded-md p-8"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <ProjectForm lang={lang} mode="create" />
      </div>
    </main>
  )
}
