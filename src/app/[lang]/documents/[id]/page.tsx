import { supabase } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { deleteDocument } from '@/app/[lang]/documents/actions'

interface Props {
  params: Promise<{ lang: string; id: string }>
}

interface AttachedProject {
  id: string
  name: string
  stage: string
}

interface ProjectDocument {
  project_id: string
  projects: AttachedProject | null
}

export default async function DocumentDetailPage({ params }: Props) {
  const { lang, id } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const { data: doc, error } = await supabase
    .from('documents')
    .select(`
      id, filename, document_type, original_file_url,
      extracted_text, uploaded_at, updated_at, metadata, embedding,
      project_documents (
        project_id,
        projects (id, name, stage)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !doc) notFound()

  const attachedProjects: AttachedProject[] = (
    (doc.project_documents as unknown as ProjectDocument[]) ?? []
  ).flatMap((pd) => (pd.projects ? [pd.projects] : []))

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
      <a
        href={`/${lang}/documents`}
        className="text-sm hover:underline mb-4 inline-block"
        style={{ color: 'var(--color-mute)' }}
      >
        ← All documents
      </a>

      <div className="mb-6">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-sm mr-3 ${
            doc.document_type === 'ett'
              ? 'bg-[var(--color-accent-blue)] text-white'
              : 'bg-[var(--color-accent-orange)] text-white'
          }`}
        >
          {doc.document_type.toUpperCase()}
        </span>
        <h1 className="mt-2 text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {doc.filename}
        </h1>
      </div>

      <dl
        className="border rounded-md divide-y mb-6"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        {(
          [
            ['Uploaded', new Date(doc.uploaded_at).toLocaleString()],
            ['Indexed', doc.embedding ? 'Yes — ready for semantic search' : 'No'],
            ['Original file', doc.original_file_url],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex px-4 py-3 gap-4">
            <dt
              className="text-xs font-medium w-28 shrink-0"
              style={{ color: 'var(--color-mute)' }}
            >
              {label}
            </dt>
            <dd className="text-sm break-all" style={{ color: 'var(--color-ink)' }}>
              {label === 'Original file' ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Download
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {attachedProjects.length > 0 && (
        <section className="mb-6" aria-labelledby="projects-heading">
          <h2
            id="projects-heading"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
            style={{ color: 'var(--color-mute)' }}
          >
            Attached to projects
          </h2>
          <ul className="space-y-2">
            {attachedProjects.map((p) => (
              <li key={p.id}>
                <a
                  href={`/${lang}/projects/${p.id}`}
                  className="text-sm underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {p.name}
                </a>
                <span className="ml-2 text-xs" style={{ color: 'var(--color-mute)' }}>
                  {p.stage}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        action={async () => {
          'use server'
          await deleteDocument(id)
        }}
      >
        <button
          type="submit"
          className="text-sm font-medium px-4 py-2 rounded-sm border transition-colors hover:bg-red-50"
          style={{ borderColor: 'var(--color-accent-red)', color: 'var(--color-accent-red)' }}
        >
          Delete document
        </button>
      </form>
    </main>
  )
}
