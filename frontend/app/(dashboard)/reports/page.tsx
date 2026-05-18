'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Filter, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { canViewReportPreview, canAccessAllBranches, canAccessPage } from '@/lib/permissions'
import type { InventoryItem, Branch, ReportFilters } from '@/lib/types'
import { fetchInventoryItems } from '@/lib/api/inventory'
import { fetchBranches } from '@/lib/api/branches'
import { exportInventoryReportPDF, exportInventoryReportExcel } from '@/lib/export-utils'

export default function ReportsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role ? canAccessAllBranches(user.role) : false
  const showPreview = user?.role ? canViewReportPreview(user.role) : false

  // Redirect staff (no reports access)
  useEffect(() => {
    if (user && !canAccessPage(user.role, 'reports')) {
      router.push('/')
    }
  }, [user, router])

  if (user && !canAccessPage(user.role, 'reports')) return null

  const [reportType, setReportType] = useState('inventory')
  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? 'all' : (user?.branch || ''))
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    fetchInventoryItems().then(setInventoryItems)
  }, [])

  useEffect(() => {
    fetchBranches().then(setBranches)
  }, [])

  // Filter items based on branch scope
  const filteredItems = isAdmin && selectedBranch === 'all'
    ? inventoryItems
    : inventoryItems.filter((item) => item.branch === (isAdmin ? selectedBranch : user?.branch))

  // Calculate some report metrics
  const totalValue = filteredItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const lowStockValue = filteredItems
    .filter(i => i.status === 'low-stock')
    .reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const expiringValue = filteredItems
    .filter(i => i.status === 'expiring')
    .reduce((sum, item) => sum + (item.quantity * item.price), 0)

  const formatPeso = (value: number) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function handleGenerateReport(filters: ReportFilters): void {
    // Generate PDF report from current filtered items
    exportInventoryReportPDF(filteredItems, {
      branch: filters.branchId || 'All Branches',
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      reportType: filters.reportType,
    })
  }

  function handleExportReport(filters: ReportFilters): void {
    // Export to Excel from current filtered items
    exportInventoryReportExcel(filteredItems, {
      branch: filters.branchId || 'All Branches',
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      reportType: filters.reportType,
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? 'Generate and export inventory reports'
            : `Reports for ${user?.branch}`}
        </p>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="movement">Stock Movement</SelectItem>
                  <SelectItem value="expiring">Expiring Products</SelectItem>
                  <SelectItem value="branch">Branch Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Branch</label>
              {isAdmin ? (
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={user?.branch || ''} disabled className="bg-muted" />
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => handleGenerateReport({
                dateFrom: startDate,
                dateTo: endDate,
                branchId: selectedBranch === 'all' ? null : selectedBranch,
                reportType: reportType as ReportFilters['reportType'],
              })}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportReport({
                dateFrom: startDate,
                dateTo: endDate,
                branchId: selectedBranch === 'all' ? null : selectedBranch,
                reportType: reportType as ReportFilters['reportType'],
              })}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPeso(totalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdmin && selectedBranch === 'all' ? 'All items combined' : `Items in ${isAdmin ? selectedBranch : user?.branch}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-status-warning">{formatPeso(lowStockValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">At Risk Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-status-critical">{formatPeso(expiringValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Expiring soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Sample Report Table - Only for admin (preview) */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Report Preview</CardTitle>
            <CardDescription>Sample data from current filters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Estimated Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.slice(0, 5).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm">{item.sku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPeso(item.quantity * item.price)}
                      </TableCell>
                      <TableCell>
                        <span className={`status-badge ${item.status === 'normal' ? 'status-normal' :
                          item.status === 'low-stock' ? 'status-warning' :
                            'status-critical'
                          }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
