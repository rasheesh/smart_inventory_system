import type { Branch } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

/**
 * GET /api/branches — Returns all branches.
 */
export async function fetchBranches(): Promise<Branch[]> {
  const res = await apiFetch('/api/branches')
  return res.json() as Promise<Branch[]>
}

export interface CreateBranchPayload {
  name: string
  address: string
  city: string
  manager: string
  contact: string
  email: string
  status?: string // 'active' | 'inactive'
}

/**
 * POST /api/branches — Creates a new branch.
 */
export async function createBranchApi(payload: CreateBranchPayload): Promise<Branch> {
  const res = await apiFetch('/api/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<Branch>
}

export interface UpdateBranchPayload {
  name?: string
  address?: string
  city?: string
  manager?: string
  contact?: string
  email?: string
  status?: string // 'active' | 'inactive'
}

/**
 * PUT /api/branches/:id — Updates an existing branch.
 */
export async function updateBranchApi(id: string, payload: UpdateBranchPayload): Promise<Branch> {
  const res = await apiFetch(`/api/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<Branch>
}

/**
 * DELETE /api/branches/:id — Deletes a branch.
 */
export async function deleteBranchApi(id: string): Promise<void> {
  await apiFetch(`/api/branches/${id}`, {
    method: 'DELETE',
  })
}
