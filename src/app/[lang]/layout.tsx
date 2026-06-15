import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/lib/i18n/routing'
import { Navigation } from '@/components/layout/Navigation'
import { AccessibilitySkipLink } from '@/components/common/AccessibilitySkipLink'

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export async function generateMetadata(_props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return {
    title: { template: '%s | Simplify', default: 'Simplify — Document Intelligence Platform' },
    description: 'AI-powered document analysis for engineering teams.',
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { lang } = await params

  if (!routing.locales.includes(lang as 'en' | 'es' | 'pt')) {
    notFound()
  }

  const messages = await getMessages()

  // Get user role for navigation (non-blocking, defaults to 'user')
  let userRole: 'admin' | 'user' = 'user'
  try {
    const { getUserRole } = await import('@/lib/roles')
    userRole = await getUserRole()
  } catch { /* not authenticated yet */ }

  return (
    <NextIntlClientProvider messages={messages}>
      <AccessibilitySkipLink />
      <Navigation lang={lang} isAdmin={userRole === 'admin'} />
      <div id="main-content" className="flex-1">
        {children}
      </div>
      <footer
        className="border-t mt-16 py-8 text-center text-xs"
        style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
      >
        &copy; {new Date().getFullYear()} Simplify &middot; Built for ibudi
      </footer>
    </NextIntlClientProvider>
  )
}
