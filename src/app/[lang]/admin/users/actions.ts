'use server'

import { isAdmin, setUserRole, type UserRole } from '@/lib/roles'

export async function updateUserRoleAction(userId: string, role: UserRole) {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized — admin access required' }

  const result = await setUserRole(userId, role)
  return result
}
