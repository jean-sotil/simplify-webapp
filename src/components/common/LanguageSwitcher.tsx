'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import { routing } from '@/lib/i18n/routing'

export function LanguageSwitcher() {
  const currentLocale = useLocale()
  const fullPathname = usePathname()
  // usePathname from next/navigation includes the locale prefix (/en/projects);
  // strip it so we can reattach the target locale cleanly.
  const pathname = fullPathname.startsWith(`/${currentLocale}`)
    ? fullPathname.slice(currentLocale.length + 1) || '/'
    : fullPathname

  return (
    <nav aria-label="Language switcher">
      <ul className="flex items-center gap-1">
        {routing.locales.map(locale => {
          const isActive = locale === currentLocale
          return (
            <li key={locale}>
              <Link
                href={`/${locale}${pathname}`}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'text-xs font-medium px-2 py-1 rounded-sm uppercase transition-colors',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-gray-100',
                ].join(' ')}
                style={!isActive ? { color: 'var(--color-mute)' } : undefined}
                hrefLang={locale}
              >
                {locale}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
