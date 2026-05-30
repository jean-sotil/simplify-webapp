import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  pathnames: {
    '/projects': {
      en: '/projects',
      es: '/proyectos',
    },
    '/projects/[id]': {
      en: '/projects/[id]',
      es: '/proyectos/[id]',
    },
    '/auth/signin': {
      en: '/auth/signin',
      es: '/auth/iniciar-sesion',
    },
  },
})
