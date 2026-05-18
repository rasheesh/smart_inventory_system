'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AuditLogFiltersSheet,
  countActiveAdvancedFilters,
  defaultAdvancedActivityFilters,
} from '@/components/audit-logs/audit-log-filters-sheet'
import { useAuth } from '@/lib/auth-context'
import { fetchActivities, fetchAuditLogStats } from '@/lib/api/activities'
import { fetchBranches } from '@/lib/api/branches'
import { exportAuditLogsExcel } from '@/lib/export-utils'
import type { Activity, ActivityFilters, AdvancedActivityFilters, AuditLogStats } from '@/lib/types'

const ACTION_OPTIONS = [
  'Created',
  'Updated',
  'Deleted',
  'Restocked',
  'Removed',
  'Transferred',
] as const

const actionTypeColors = {
  Restocked: 'bg-status-normal/10 text-status-normal',
  Transferred: 'bg-primary/10 text-primary',
  Removed: 'bg-status-critical/10 text-status-critical',
  Created: 'bg-blue-50 text-blue-700',
  Updated: 'bg-yellow-50 text-yellow-700',
  Deleted: 'bg-status-critical/10 text-status-critical',
}

function buildActivityQueryFilters(
  searchUser: string,
  filterAction: string,
  advanced: AdvancedActivityFilters,
): ActivityFilters {
  return {
    ...(searchUser.trim() ? { searchUser: searchUser.trim() } : {}),
    ...(filterAction !== 'all' ? { action: filterAction } : {}),
    ...(advanced.branch !== 'all' ? { branch: advanced.branch } : {}),
    ...(advanced.searchItem.trim() ? { searchItem: advanced.searchItem.trim() } : {}),
    ...(advanced.dateFrom ? { dateFrom: advanced.dateFrom } : {}),
    ...(advanced.dateTo ? { dateTo: advanced.dateTo } : {}),
  }
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<AuditLogStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)

  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [searchUser, setSearchUser] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedActivityFilters>(
    defaultAdvancedActivityFilters,
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [branchNames, setBranchNames] = useState<string[]>([])

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  useEffect(() => {
    fetchAuditLogStats()
      .then(setStats)
      .catch(() => setStatsError(true))
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    fetchBranches()
      .then((branches) => setBranchNames(branches.map((b) => b.name).sort()))
      .catch(() => {
        // Fall back to branches seen in activity data
      })
  }, [])

  const fetchActivitiesForFilters = useCallback(
    async (
      userSearch: string,
      action: string,
      advanced: AdvancedActivityFilters,
    ) => {
      setActivitiesLoading(true)
      try {
        const data = await fetchActivities(
          buildActivityQueryFilters(userSearch, action, advanced),
        )
        setActivities(data)
      } catch {
        setActivities([])
      } finally {
        setActivitiesLoading(false)
      }
    },
    [],
  )

  // advancedFilters changes are fetched in handleApplyAdvancedFilters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const debounceMs = searchUser.trim() ? 300 : 0
    const timer = setTimeout(() => {
      void fetchActivitiesForFilters(searchUser, filterAction, advancedFilters)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [user, searchUser, filterAction, fetchActivitiesForFilters])

  function handleApplyAdvancedFilters(filters: AdvancedActivityFilters): void {
    setAdvancedFilters(filters)
    void fetchActivitiesForFilters(searchUser, filterAction, filters)
  }

  const branchOptions = useMemo(() => {
    const fromActivities = activities.map((a) => a.branch)
    return [...new Set([...branchNames, ...fromActivities])].sort()
  }, [branchNames, activities])

  const activeAdvancedCount = countActiveAdvancedFilters(advancedFilters)

  if (!user || user.role !== 'admin') return null

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function handleExportAuditLogs(): void {
    // Export current filtered activities to Excel
    exportAuditLogsExcel(activities)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">View all system activities and user actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">Search by User</label>
              <Input
                placeholder="Enter user name..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">Filter by Action</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTION_OPTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(true)}
                className="relative"
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
                {activeAdvancedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-xs"
                  >
                    {activeAdvancedCount}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" onClick={handleExportAuditLogs}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {activeAdvancedCount > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Advanced filters active
              {advancedFilters.branch !== 'all' && ` · Branch: ${advancedFilters.branch}`}
              {advancedFilters.searchItem.trim() && ` · Item: "${advancedFilters.searchItem.trim()}"`}
              {advancedFilters.dateFrom && ` · From ${advancedFilters.dateFrom}`}
              {advancedFilters.dateTo && ` · To ${advancedFilters.dateTo}`}
            </p>
          )}
        </CardContent>
      </Card>

      <AuditLogFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={advancedFilters}
        branches={branchOptions}
        onApply={handleApplyAdvancedFilters}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Total Activities</p>
          <div className="text-2xl font-bold text-foreground mt-1">
            {activitiesLoading ? <Skeleton className="h-8 w-12" /> : activities.length}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Last 24 Hours</p>
          <div className="text-2xl font-bold text-foreground mt-1">
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : statsError ? (
              '--'
            ) : (
              stats!.last24Hours
            )}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Last Week</p>
          <div className="text-2xl font-bold text-foreground mt-1">
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : statsError ? (
              '--'
            ) : (
              stats!.lastWeek
            )}
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Active Users</p>
          <div className="text-2xl font-bold text-foreground mt-1">
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : statsError ? (
              '--'
            ) : (
              stats!.activeUsers
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {activitiesLoading ? 'Loading...' : `${activities.length} records found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Item/Subject</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No activities found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.user}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            actionTypeColors[activity.action as keyof typeof actionTypeColors] ||
                            'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {activity.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{activity.item || '-'}</TableCell>
                      <TableCell className="text-sm">{activity.branch}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.details}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(activity.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
