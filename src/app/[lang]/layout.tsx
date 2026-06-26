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
  let userEmail: string | null = null
  try {
    const { getUserRole } = await import('@/lib/roles')
    const { getUser } = await import('@/lib/auth')
    const [role, user] = await Promise.all([getUserRole(), getUser()])
    userRole = role
    userEmail = user?.email ?? null
  } catch { /* not authenticated yet */ }

  return (
    <NextIntlClientProvider messages={messages}>
      <AccessibilitySkipLink />
      <Navigation lang={lang} isAdmin={userRole === 'admin'} userEmail={userEmail} />
      <div id="main-content" className="flex-1" suppressHydrationWarning>
        {children}
      </div>
      <footer
        className="border-t mt-16 py-5"
        style={{ borderColor: 'var(--color-hairline)' }}
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
          <p className="text-xs" style={{ color: 'var(--color-mute)' }}>
            &copy; {new Date().getFullYear()} Simplify
          </p>
          <span className="text-xs" style={{ color: 'var(--color-hairline)' }}>|</span>
          <a
            href="https://www.ibudi.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-mute)' }}
          >
            <img src="/logo.ibudi.png" alt="ibudi.dev" width={20} height={20} className="rounded-sm" />
            <span>ibudi.dev</span>
          </a>
        </div>
      </footer>
    </NextIntlClientProvider>
  )
}
