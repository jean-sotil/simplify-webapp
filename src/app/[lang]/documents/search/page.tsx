import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DocumentSelector } from '@/components/analysis/DocumentSelector'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ type?: string }>
}

export default async function DocumentSearchPage({ params, searchParams }: Props) {
  const { lang } = await params
  const { type } = await searchParams
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const docType = type === 'ett' || type === 'hardware' ? type : undefined

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          Search
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          Semantic Document Search
        </h1>
        {docType && (
          <p className="mt-2 text-sm" style={{ color: 'var(--color-body)' }}>
            Filtering by: <strong>{docType.toUpperCase()}</strong> documents
          </p>
        )}
      </div>

      <DocumentSelector teamId={user.id} />
    </main>
  )
}
