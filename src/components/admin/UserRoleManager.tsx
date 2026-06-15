'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateUserRoleAction } from '@/app/[lang]/admin/users/actions'
import type { UserRole } from '@/lib/roles'

interface UserRow {
  id: string
  email: string
  role: UserRole
  created_at: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
}

export function UserRoleManager({ users, currentUserId }: Props) {
  const t = useTranslations('admin')
  const [userList, setUserList] = useState(users)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  function handleRoleChange(userId: string, newRole: UserRole) {
    setMessage('')
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, newRole)
      if (result.error) {
        setMessage(`Error: ${result.error}`)
      } else {
        setUserList(prev =>
          prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
        )
        setMessage(t('roleUpdated'))
        setTimeout(() => setMessage(''), 3000)
      }
    })
  }

  return (
    <div>
      {message && (
        <p
          className="mb-4 text-sm px-4 py-2 rounded-sm"
          style={{
            color: message.startsWith('Error') ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
            backgroundColor: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
          }}
        >
          {message}
        </p>
      )}

      <div
        className="border rounded-md overflow-hidden"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-mute)' }}>
                {t('email')}
              </th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-mute)' }}>
                {t('role')}
              </th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-mute)' }}>
                {t('joined')}
              </th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-mute)' }}>
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {userList.map(user => (
              <tr
                key={user.id}
                className="border-t"
                style={{ borderColor: 'var(--color-hairline)' }}
              >
                <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                  {user.email}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-mute)' }}>{t('you')}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-sm ${
                      user.role === 'admin'
                        ? 'bg-[var(--color-accent-blue)] text-white'
                        : 'bg-gray-100'
                    }`}
                    style={user.role !== 'admin' ? { color: 'var(--color-mute)' } : undefined}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-mute)' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                      disabled={isPending}
                      className="text-xs font-medium px-3 py-1 rounded-sm border transition-colors hover:opacity-70 cursor-pointer disabled:opacity-40"
                      style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
                    >
                      {user.role === 'admin' ? t('removeAdmin') : t('makeAdmin')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
