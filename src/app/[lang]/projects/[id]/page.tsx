import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { ProjectPipeline } from '@/components/projects/ProjectPipeline'
import { AttachDocumentsDialog } from '@/components/projects/AttachDocumentsDialog'
import { detachDocumentFromProject } from '@/app/[lang]/projects/[id]/actions'
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

interface ProjectDocumentRow {
  document_id: string
  documents: AttachedDocument | AttachedDocument[] | null
}

export default async function ProjectDetailPage({ params }: Props) {
  const { lang, id } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const supabase = await createSupabaseServerClient()

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

  const projectDocs = (project.project_documents as ProjectDocumentRow[] | null) ?? []
  const attachedDocuments: AttachedDocument[] = projectDocs.flatMap(pd => {
    if (!pd.documents) return []
    return Array.isArray(pd.documents) ? pd.documents : [pd.documents]
  })

  const attachedIds = new Set(attachedDocuments.map(d => d.id))

  const { data: allDocs } = await supabase
    .from('documents')
    .select('id, filename, document_type')
    .order('uploaded_at', { ascending: false })

  const availableForAttach = (allDocs ?? []).filter(d => !attachedIds.has(d.id))

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <a
          href={`/${lang}/projects`}
          className="text-sm inline-block mb-4 hover:underline underline-offset-2"
          style={{ color: 'var(--color-mute)' }}
        >
          ← All projects
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

      <section className="mb-8" aria-labelledby="pipeline-heading">
        <h2
          id="pipeline-heading"
          className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
          style={{ color: 'var(--color-mute)' }}
        >
          Pipeline
        </h2>
        <ProjectPipeline projectId={project.id} currentStage={project.stage as ProjectStage} />
      </section>

      <section className="mb-8" aria-labelledby="docs-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="docs-heading"
            className="text-xs font-medium uppercase tracking-[1.5px]"
            style={{ color: 'var(--color-mute)' }}
          >
            Attached documents ({attachedDocuments.length})
          </h2>
          <AttachDocumentsDialog
            projectId={project.id}
            availableDocuments={availableForAttach}
          />
        </div>

        {attachedDocuments.length > 0 ? (
          <ul className="space-y-2">
            {attachedDocuments.map(doc => (
              <li
                key={doc.id}
                className="flex items-center justify-between border rounded-md px-4 py-3"
                style={{ borderColor: 'var(--color-hairline)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-1 rounded-sm ${
                      doc.document_type === 'ett'
                        ? 'bg-[var(--color-accent-blue)] text-white'
                        : 'bg-[var(--color-accent-orange)] text-white'
                    }`}
                  >
                    {doc.document_type.toUpperCase()}
                  </span>
                  <span className="text-sm truncate" style={{ color: 'var(--color-ink)' }}>
                    {doc.filename}
                  </span>
                </div>
                <form
                  action={async () => {
                    'use server'
                    await detachDocumentFromProject(id, doc.id)
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs hover:underline ml-4"
                    style={{ color: 'var(--color-accent-red)' }}
                  >
                    Remove
                  </button>
                </form>
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
          className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
          style={{ color: 'var(--color-mute)' }}
        >
          Analysis
        </h2>
        <a
          href={`/${lang}/projects/${project.id}/analysis`}
          className="inline-block rounded-sm px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
        >
          Open analysis →
        </a>
      </section>
    </main>
  )
}
