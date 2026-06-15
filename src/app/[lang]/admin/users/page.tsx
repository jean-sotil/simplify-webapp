import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { isAdmin, getAllUsersWithRoles } from '@/lib/roles'
import { UserRoleManager } from '@/components/admin/UserRoleManager'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function AdminUsersPage({ params }: Props) {
  const { lang } = await params
  const user = await getUser()
  if (!user) redirect(`/${lang}/auth/signin`)

  const admin = await isAdmin()
  if (!admin) redirect(`/${lang}/projects`)

  const t = await getTranslations('admin')
  const users = await getAllUsersWithRoles()

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p
          className="text-xs font-medium uppercase tracking-[1.5px] mb-1"
          style={{ color: 'var(--color-mute)' }}
        >
          {t('title')}
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('userManagement')}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-body)' }}>
          {t('subtitle')}
        </p>
      </div>

      <UserRoleManager users={users} currentUserId={user.id} />
    </main>
  )
}
