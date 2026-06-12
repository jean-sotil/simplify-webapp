import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SemanticSearch } from '@/components/documents/SemanticSearch'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function DocumentSearchPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Documents
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          Semantic Search
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-body)' }}>
          Search across all your documents by meaning. Ask a question or describe what you need.
        </p>
      </div>

      <SemanticSearch />
    </main>
  )
}
