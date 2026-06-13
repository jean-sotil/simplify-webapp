import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { SemanticSearch } from '@/components/documents/SemanticSearch'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function DocumentSearchPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const t = await getTranslations('search')

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)', letterSpacing: '1.5px' }}
        >
          {t('title')}
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('title')}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-body)' }}>
          {t('subtitle')}
        </p>
      </div>

      <SemanticSearch />
    </main>
  )
}
