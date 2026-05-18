import type {
  InventoryItem,
  InventoryFilters,
  InventoryByBranchDataPoint,
  ExpirationTimelineDataPoint,
} from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { getToken } from '@/lib/api/client'

/**
 * GET /api/inventory — Returns all inventory items, optionally filtered by branch, status, or search query.
 */
export async function fetchInventoryItems(
  filters?: InventoryFilters,
): Promise<InventoryItem[]> {
  const params = new URLSearchParams()
  if (filters?.branchId) params.set('branchId', filters.branchId)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.searchQuery) params.set('searchQuery', filters.searchQuery)

  const query = params.toString()
  const res = await apiFetch(`/api/inventory${query ? `?${query}` : ''}`)
  const data = (await res.json()) as Array<Record<string, unknown>>

  // Normalise date strings back to Date objects
  return data.map((item) => ({
    ...item,
    expiryDate: new Date(item.expiryDate as string),
    lastRestocked: new Date(item.lastRestocked as string),
  })) as InventoryItem[]
}

/**
 * POST /api/inventory — Create a new inventory item.
 */
export interface CreateInventoryItemPayload {
  name: string
  sku: string
  quantity: number
  price: number
  reorderLevel: number
  expiryDate: string // ISO date string
  supplier: string
  branch: string
}

export async function createInventoryItemApi(
  payload: CreateInventoryItemPayload,
): Promise<InventoryItem> {
  const res = await apiFetch('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as Record<string, unknown>
  return {
    ...data,
    expiryDate: new Date(data.expiryDate as string),
    lastRestocked: new Date(data.lastRestocked as string),
  } as InventoryItem
}

/**
 * GET /api/inventory/export — Download inventory data as a CSV file.
 */
export async function exportInventoryCSV(): Promise<void> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const token = getToken()

  const res = await fetch(`${BASE_URL}/api/inventory/export`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Failed to export inventory')
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'inventory_export.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * GET /api/inventory/by-branch — Returns aggregated inventory counts and values grouped by branch.
 */
export async function fetchInventoryByBranch(): Promise<InventoryByBranchDataPoint[]> {
  const res = await apiFetch('/api/inventory/by-branch')
  return res.json() as Promise<InventoryByBranchDataPoint[]>
}

/**
 * GET /api/inventory/expiration-timeline — Returns expiring product counts grouped by time period.
 */
export async function fetchExpirationTimeline(): Promise<ExpirationTimelineDataPoint[]> {
  const res = await apiFetch('/api/inventory/expiration-timeline')
  return res.json() as Promise<ExpirationTimelineDataPoint[]>
}

/**
 * PUT /api/inventory/:id — Update an inventory item.
 */
export interface UpdateInventoryItemPayload {
  name?: string
  sku?: string
  price?: number
  reorderLevel?: number
  expiryDate?: string
  supplier?: string
  branch?: string
  status?: string
}

export async function updateInventoryItemApi(
  id: string,
  payload: UpdateInventoryItemPayload,
): Promise<InventoryItem> {
  const res = await apiFetch(`/api/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as Record<string, unknown>
  return {
    ...data,
    expiryDate: new Date(data.expiryDate as string),
    lastRestocked: new Date(data.lastRestocked as string),
  } as InventoryItem
}

/**
 * DELETE /api/inventory/:id — Delete an inventory item.
 */
export async function deleteInventoryItemApi(id: string): Promise<void> {
  await apiFetch(`/api/inventory/${id}`, {
    method: 'DELETE',
  })
}

