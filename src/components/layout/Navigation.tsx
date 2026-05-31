'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface NavigationProps {
  lang: string
}

const NAV_LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/documents', label: 'Documents' },
]

export function Navigation({ lang }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push(`/${lang}/auth/signin`)
  }

  return (
    <header
      className="border-b"
      style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-canvas)' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Wordmark */}
        <Link
          href={`/${lang}/projects`}
          className="text-sm font-semibold tracking-tight"
          style={{ color: 'var(--color-ink)' }}
          aria-label="Simplify — home"
        >
          Simplify
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const fullHref = `/${lang}${href}`
            const isActive = pathname.startsWith(fullHref)
            return (
              <Link
                key={href}
                href={fullHref}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'px-3 py-1.5 rounded-sm text-sm font-medium transition-colors',
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50',
                ].join(' ')}
                style={{ color: isActive ? 'var(--color-ink)' : 'var(--color-body)' }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-sm border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-mute)' }}
          >
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(v => !v)}
        >
          <span className="w-5 h-px block" style={{ backgroundColor: 'var(--color-ink)' }} />
          <span className="w-5 h-px block" style={{ backgroundColor: 'var(--color-ink)' }} />
          <span className="w-5 h-px block" style={{ backgroundColor: 'var(--color-ink)' }} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="sm:hidden border-t px-4 py-4 flex flex-col gap-2"
          style={{ borderColor: 'var(--color-hairline)' }}
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const fullHref = `/${lang}${href}`
            const isActive = pathname.startsWith(fullHref)
            return (
              <Link
                key={href}
                href={fullHref}
                aria-current={isActive ? 'page' : undefined}
                className="text-sm font-medium px-3 py-2 rounded-sm"
                style={{ color: isActive ? 'var(--color-ink)' : 'var(--color-body)' }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            )
          })}
          <div
            className="pt-2 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs"
              style={{ color: 'var(--color-mute)' }}
            >
              Sign out
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
