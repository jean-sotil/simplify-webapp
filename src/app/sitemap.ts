import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['en', 'es']
  const staticRoutes = [
    '',
    '/projects',
    '/documents',
    '/auth/signin',
  ]

  return locales.flatMap(locale =>
    staticRoutes.map(route => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1.0 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map(l => [l, `${BASE_URL}/${l}${route}`])
        ),
      },
    }))
  )
}
