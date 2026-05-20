'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertList } from '@/components/notifications/alert-list'
import { fetchAlerts } from '@/lib/api/alerts'
import { useAuth } from '@/lib/auth-context'
import { canAccessAllBranches, canAccessPage } from '@/lib/permissions'
import type { Alert, AlertFilters } from '@/lib/types'

type AlertSort = 'newest' | 'oldest' | 'severity'

const SEVERITY_ORDER: Record<Alert['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role ? canAccessAllBranches(user.role) : false
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const [typeFilter, setTypeFilter] = useState<AlertFilters['type']>('all')
  const [severityFilter, setSeverityFilter] = useState<AlertFilters['severity']>('all')
  const [sortBy, setSortBy] = useState<AlertSort>('newest')

  useEffect(() => {
    if (user && !canAccessPage(user.role, 'notifications')) {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    if (!user || !canAccessPage(user.role, 'notifications')) return

    async function loadAlerts() {
      setIsLoading(true)
      setError(false)
      try {
        const data = await fetchAlerts()
        const scopedAlerts = isAdmin
          ? data
          : data.filter((alert) => alert.branch === user?.branch)
        setAlerts(scopedAlerts)
      } catch {
        setError(true)
        // silently keep the empty array
      } finally {
        setIsLoading(false)
      }
    }

    loadAlerts()
  }, [user, isAdmin])

  const displayedAlerts = useMemo(() => {
    let result = alerts

    if (typeFilter && typeFilter !== 'all') {
      result = result.filter((alert) => alert.type === typeFilter)
    }

    if (severityFilter && severityFilter !== 'all') {
      result = result.filter((alert) => alert.severity === severityFilter)
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'severity') {
        const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        if (severityDiff !== 0) return severityDiff
      }

      const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      return sortBy === 'oldest' ? -timeDiff : timeDiff
    })
  }, [alerts, typeFilter, severityFilter, sortBy])

  if (!user || !canAccessPage(user.role, 'notifications')) return null

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">Stay updated with system alerts and inventory notifications</p>
      </div>

      {/* Alert Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Critical Alerts</p>
          <p className="text-2xl font-bold text-status-critical mt-1">{criticalCount}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Warnings</p>
          <p className="text-2xl font-bold text-status-warning mt-1">{warningCount}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Info</p>
          <p className="text-2xl font-bold text-primary mt-1">{infoCount}</p>
        </div>
      </div>

      {/* Filters & sort */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter ?? 'all'} onValueChange={(value) => setTypeFilter(value as AlertFilters['type'])}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter ?? 'all'} onValueChange={(value) => setSeverityFilter(value as AlertFilters['severity'])}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as AlertSort)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="severity">Severity (high to low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      <AlertList alerts={displayedAlerts} />
    </div>
  )
}
