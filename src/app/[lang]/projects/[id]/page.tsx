import { supabase } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { ProjectPipeline } from '@/components/projects/ProjectPipeline'
import type { ProjectStage } from '@/lib/validation/schemas'

interface Props {
  params: Promise<{ lang: string; id: string }>
}

interface AttachedDocument {
  id: string
  filename: string
  document_type: string
  uploaded_at: string
}

interface ProjectDocument {
  document_id: string
  documents: AttachedDocument | AttachedDocument[] | null
}

export default async function ProjectDetailPage({ params }: Props) {
  const { lang, id } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id, name, description, stage, owner_id, created_at, updated_at,
      project_documents (
        document_id,
        documents (id, filename, document_type, uploaded_at)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  const projectDocs = (project.project_documents as ProjectDocument[] | null) ?? []
  const attachedDocuments: AttachedDocument[] = projectDocs.flatMap(pd => {
    if (!pd.documents) return []
    return Array.isArray(pd.documents) ? pd.documents : [pd.documents]
  })

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <a
          href={`/${lang}/projects`}
          className="text-sm inline-block mb-4 hover:underline underline-offset-2"
          style={{ color: 'var(--color-mute)' }}
        >
          ← All projects
        </a>
        <h1
          className="text-3xl font-semibold mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          {project.name}
        </h1>
        {project.description && (
          <p className="text-sm" style={{ color: 'var(--color-body)' }}>
            {project.description}
          </p>
        )}
      </div>

      <section className="mb-8" aria-labelledby="pipeline-heading">
        <h2
          id="pipeline-heading"
          className="text-xs font-medium uppercase mb-3"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Pipeline stage
        </h2>
        <ProjectPipeline
          projectId={project.id}
          currentStage={project.stage as ProjectStage}
        />
      </section>

      <section className="mb-8" aria-labelledby="docs-heading">
        <h2
          id="docs-heading"
          className="text-xs font-medium uppercase mb-3"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Attached documents
        </h2>
        {attachedDocuments.length > 0 ? (
          <ul className="space-y-2">
            {attachedDocuments.map(doc => (
              <li
                key={doc.id}
                className="flex items-center justify-between border rounded-md px-4 py-3 text-sm"
                style={{ borderColor: 'var(--color-hairline)' }}
              >
                <span
                  className="font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {doc.filename}
                </span>
                <span
                  className="text-xs uppercase"
                  style={{ color: 'var(--color-mute)' }}
                >
                  {doc.document_type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
            No documents attached yet.
          </p>
        )}
      </section>

      <section aria-labelledby="analysis-heading">
        <h2
          id="analysis-heading"
          className="text-xs font-medium uppercase mb-3"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Analysis
        </h2>
        <a
          href={`/${lang}/projects/${project.id}/analysis`}
          className="inline-block text-sm font-medium px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
          }}
        >
          Go to analysis →
        </a>
      </section>
    </main>
  )
}
