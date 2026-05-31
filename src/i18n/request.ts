import { getRequestConfig } from 'next-intl/server'
import { routing } from '@/lib/i18n/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as 'en' | 'es')) {
    locale = routing.defaultLocale
  }

  const messages = (await import(`../lib/i18n/messages/${locale}.json`)).default

  return { locale, messages }
})
