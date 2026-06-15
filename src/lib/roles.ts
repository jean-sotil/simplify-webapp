import 'server-only'

import { supabaseAdmin } from '@/lib/db.server'
import { getUser } from '@/lib/auth'

export type UserRole = 'admin' | 'user'

/**
 * Gets the role of the current authenticated user.
 * Returns 'user' as default if no role is found.
 */
export async function getUserRole(): Promise<UserRole> {
  const user = await getUser()
  if (!user) return 'user'

  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return (data?.role as UserRole) ?? 'user'
}

/**
 * Checks if the current user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

/**
 * Sets the role for a user. Only callable from server-side (service role).
 * Uses UPSERT to prevent duplicates — one row per user guaranteed.
 */
export async function setUserRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from('user_roles')
    .upsert(
      { user_id: userId, role, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return {}
}

/**
 * Gets all users with their roles. Admin only.
 */
export async function getAllUsersWithRoles(): Promise<Array<{
  id: string
  email: string
  role: UserRole
  created_at: string
}>> {
  // Get all users from auth (via admin API)
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()

  // Get all roles
  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role')

  const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]))

  return (authUsers?.users || []).map(u => ({
    id: u.id,
    email: u.email ?? '',
    role: (roleMap.get(u.id) as UserRole) ?? 'user',
    created_at: u.created_at,
  }))
}
