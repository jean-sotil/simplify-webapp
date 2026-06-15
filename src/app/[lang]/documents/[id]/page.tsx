import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DocumentActions } from '@/components/documents/DocumentActions'

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

  const t = await getTranslations('documentDetail')
  const supabase = await createSupabaseServerClient()

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
        &larr; {t('backToDocuments')}
      </a>

      <div className="mb-6">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-sm mr-3 ${
            doc.document_type === 'ett'
              ? 'bg-[var(--color-accent-blue)] text-white'
              : doc.document_type === 'software'
                ? 'bg-emerald-600 text-white'
                : 'bg-[var(--color-accent-orange)] text-white'
          }`}
        >
          {doc.document_type === 'ett' ? 'ETT' : doc.document_type === 'hardware' ? 'Hardware' : 'Software'}
        </span>
        <h1 className="mt-2 text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {doc.filename}
        </h1>
      </div>

      {/* Metadata */}
      <dl
        className="border rounded-md divide-y mb-6"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <div className="flex px-4 py-3 gap-4">
          <dt className="text-xs font-medium w-28 shrink-0" style={{ color: 'var(--color-mute)' }}>
            {t('uploaded')}
          </dt>
          <dd className="text-sm" style={{ color: 'var(--color-ink)' }}>
            {new Date(doc.uploaded_at).toLocaleString()}
          </dd>
        </div>
        <div className="flex px-4 py-3 gap-4">
          <dt className="text-xs font-medium w-28 shrink-0" style={{ color: 'var(--color-mute)' }}>
            {t('indexed')}
          </dt>
          <dd className="text-sm" style={{ color: 'var(--color-ink)' }}>
            {doc.embedding ? t('indexedYes') : t('indexedNo')}
          </dd>
        </div>
      </dl>

      {/* Action buttons + PDF preview toggle */}
      {doc.original_file_url && (
        <DocumentActions
          pdfUrl={doc.original_file_url}
          documentId={doc.id}
          lang={lang}
        />
      )}

      {/* Attached projects */}
      {attachedProjects.length > 0 && (
        <section className="mb-6" aria-labelledby="projects-heading">
          <h2
            id="projects-heading"
            className="text-xs font-medium uppercase tracking-[1.5px] mb-3"
            style={{ color: 'var(--color-mute)' }}
          >
            {t('attachedToProjects')}
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
    </main>
  )
}
