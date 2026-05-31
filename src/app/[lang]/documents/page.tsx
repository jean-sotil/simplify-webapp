import type { Metadata } from 'next'
import { supabase } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DocumentUploader } from '@/components/documents/DocumentUploader'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return {
    title: 'Documents',
    alternates: { languages: { en: '/en/documents', es: '/es/documents' } },
  }
}

interface Props {
  params: Promise<{ lang: string }>
}

const TYPE_LABELS: Record<string, string> = { ett: 'ETT', hardware: 'Hardware' }
const TYPE_COLORS: Record<string, string> = {
  ett: 'bg-[var(--color-accent-blue)] text-white',
  hardware: 'bg-[var(--color-accent-orange)] text-white',
}

export default async function DocumentsPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, filename, document_type, uploaded_at, embedding')
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
            style={{ color: 'var(--color-mute)' }}
          >
            Documents
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
            Document Library
          </h1>
        </div>
        <a
          href={`/${lang}/documents/search`}
          className="text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--color-ink)' }}
        >
          Semantic search →
        </a>
      </div>

      <section className="mb-10" aria-labelledby="upload-heading">
        <h2
          id="upload-heading"
          className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          Upload new document
        </h2>
        <div className="max-w-lg">
          <DocumentUploader teamId={user.id} lang={lang} />
        </div>
      </section>

      <section aria-labelledby="library-heading">
        <h2
          id="library-heading"
          className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          All documents ({documents?.length ?? 0})
        </h2>

        {documents && documents.length > 0 ? (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/${lang}/documents/${doc.id}`}
                  className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--color-hairline)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded-sm ${TYPE_COLORS[doc.document_type] ?? 'bg-gray-100'}`}
                    >
                      {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                    </span>
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {doc.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {doc.embedding ? (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-accent-green)' }}
                        title="Indexed for semantic search"
                      >
                        ● Indexed
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
                        ○ Not indexed
                      </span>
                    )}
                    <time
                      className="text-xs"
                      style={{ color: 'var(--color-mute)' }}
                      dateTime={doc.uploaded_at}
                    >
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </time>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="text-center py-12 border rounded-md"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-mute)' }}>
              No documents uploaded yet.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
