import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/lib/i18n/routing'

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { lang } = await params

  if (!routing.locales.includes(lang as 'en' | 'es')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
