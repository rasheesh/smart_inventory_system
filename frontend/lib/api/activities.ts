import type { Activity, ActivityFilters, AuditLogStats } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

/**
 * GET /api/activities — Returns all activity log entries, optionally filtered by user or action type.
 */
export async function fetchActivities(filters?: ActivityFilters): Promise<Activity[]> {
  const params = new URLSearchParams()
  if (filters?.searchUser) params.set('searchUser', filters.searchUser)
  if (filters?.action && filters.action !== 'all') params.set('action', filters.action)
  if (filters?.branch && filters.branch !== 'all') params.set('branch', filters.branch)
  if (filters?.searchItem) params.set('searchItem', filters.searchItem)
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters?.dateTo) params.set('dateTo', filters.dateTo)

  const query = params.toString()
  const res = await apiFetch(`/api/activities${query ? `?${query}` : ''}`)
  const data = (await res.json()) as Array<Record<string, unknown>>

  return data.map((activity) => ({
    ...activity,
    // Backend returns { user: { name: string } } — flatten to user string
    user: (activity.user as { name?: string })?.name ?? (activity.user as string),
    timestamp: new Date(activity.timestamp as string),
  })) as Activity[]
}

/**
 * GET /api/activities/stats — Returns aggregate statistics for the audit log page.
 */
export async function fetchAuditLogStats(): Promise<AuditLogStats> {
  const res = await apiFetch('/api/activities/stats')
  return res.json() as Promise<AuditLogStats>
}
