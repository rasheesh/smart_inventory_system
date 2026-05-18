import type { User, UserRole } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

function normalizeRole(role: string): UserRole {
  if (role === 'branch_manager') return 'branch-manager'
  return role as UserRole
}

function normalizeUser(user: Record<string, unknown>): User {
  return {
    ...user,
    role: normalizeRole(user.role as string),
    lastLogin: user.lastLogin ? new Date(user.lastLogin as string) : new Date(0),
  } as User
}

/**
 * GET /api/users — Returns all users (admin only).
 */
export async function fetchUsers(): Promise<User[]> {
  const res = await apiFetch('/api/users')
  const data = (await res.json()) as Array<Record<string, unknown>>
  return data.map(normalizeUser)
}

/**
 * POST /api/users — Create a new user (admin only).
 */
export interface CreateUserPayload {
  name: string
  email: string
  username: string
  password: string
  role: UserRole
  assignedBranch: string
  status?: 'active' | 'inactive'
}

export async function createUserApi(payload: CreateUserPayload): Promise<User> {
  const res = await apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as Record<string, unknown>
  return normalizeUser(data)
}

/**
 * PUT /api/users/:id — Update an existing user (admin only).
 */
export interface UpdateUserPayload {
  name?: string
  email?: string
  username?: string
  password?: string
  role?: UserRole
  assignedBranch?: string
  status?: 'active' | 'inactive'
}

export async function updateUserApi(id: string, payload: UpdateUserPayload): Promise<User> {
  const res = await apiFetch(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as Record<string, unknown>
  return normalizeUser(data)
}

/**
 * DELETE /api/users/:id — Delete a user (admin only).
 */
export async function deleteUserApi(id: string): Promise<void> {
  await apiFetch(`/api/users/${id}`, {
    method: 'DELETE',
  })
}
