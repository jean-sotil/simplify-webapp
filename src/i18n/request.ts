import { getRequestConfig } from 'next-intl/server'
import { routing } from '@/lib/i18n/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Fallback to the default locale if the requested locale is not supported
  if (!locale || !routing.locales.includes(locale as 'en' | 'es')) {
    locale = routing.defaultLocale
  }

  // Return minimal config — messages will be added when translation files exist
  return {
    locale,
    messages: {},
  }
})
