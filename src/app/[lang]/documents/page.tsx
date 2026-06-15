import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { DocumentList } from '@/components/documents/DocumentList'

// Allow server actions called from this page up to 300s (large PDF processing)
export const maxDuration = 300

export async function generateMetadata(_props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return {
    title: 'Documents',
    alternates: { languages: { en: '/en/documents', es: '/es/documents' } },
  }
}

interface Props {
  params: Promise<{ lang: string }>
}

export default async function DocumentsPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('documents')
  const supabase = await createSupabaseServerClient()

  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, filename, document_type, uploaded_at, embedding')
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
            style={{ color: 'var(--color-mute)' }}
          >
            {t('allDocuments')}
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
            {t('title')}
          </h1>
        </div>
        <a
          href={`/${lang}/documents/search`}
          className="text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('semanticSearch')} →
        </a>
      </div>

      <section className="mb-10" aria-labelledby="upload-heading">
        <h2
          id="upload-heading"
          className="text-xs font-medium uppercase tracking-[1.5px] mb-4"
          style={{ color: 'var(--color-mute)' }}
        >
          {t('upload')}
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
          {t('allDocuments')}
        </h2>

        <DocumentList documents={documents ?? []} lang={lang} />
      </section>
    </main>
  )
}
