import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { InventoryItem, Activity } from './types'

function formatPeso(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatReportStatus(status: InventoryItem['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

/**
 * Export inventory report to PDF
 */
export function exportInventoryReportPDF(
  items: InventoryItem[],
  filters: {
    branch?: string
    dateFrom?: string
    dateTo?: string
  }
) {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('IntelliShelf - Inventory Report', 14, 20)
  
  // Add metadata
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 14, 28)
  
  if (filters.branch && filters.branch !== 'all') {
    doc.text(`Branch: ${filters.branch}`, 14, 34)
  }
  
  if (filters.dateFrom || filters.dateTo) {
    const dateRange = `Date Range: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}`
    doc.text(dateRange, 14, filters.branch && filters.branch !== 'all' ? 40 : 34)
  }
  
  // Calculate summary
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const lowStockCount = items.filter(i => i.status === 'low-stock').length
  const expiringCount = items.filter(i => i.status === 'expiring').length
  
  // Add summary section
  const summaryY = filters.branch && filters.branch !== 'all' ? 48 : 42
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, summaryY)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Items: ${items.length}`, 14, summaryY + 6)
  doc.text(`Total Value: ₱${totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 14, summaryY + 12)
  doc.text(`Low Stock Items: ${lowStockCount}`, 14, summaryY + 18)
  doc.text(`Expiring Soon: ${expiringCount}`, 14, summaryY + 24)
  
  // Add table
  const tableData = items.map(item => [
    item.name,
    item.sku,
    item.quantity.toString(),
    `₱${item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `₱${(item.quantity * item.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    item.status.charAt(0).toUpperCase() + item.status.slice(1),
  ])
  
  autoTable(doc, {
    startY: summaryY + 32,
    head: [['Item', 'SKU', 'Qty', 'Price', 'Total Value', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  })
  
  // Save the PDF
  const filename = `inventory_report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

export interface InventoryReportExcelOptions {
  branch?: string
  dateFrom?: string
  dateTo?: string
  branchScopeLabel: string
  totalInventoryValue: string
  lowStockValue: string
  atRiskValue: string
}

const PREVIEW_ROW_LIMIT = 5

function buildInventoryPreviewRows(items: InventoryItem[]): (string | number)[][] {
  return items.slice(0, PREVIEW_ROW_LIMIT).map((item) => [
    item.name,
    item.sku,
    item.quantity,
    formatPeso(item.quantity * item.price),
    formatReportStatus(item.status),
  ])
}

/**
 * Export inventory report to Excel (matches Reports page layout and values)
 */
export function exportInventoryReportExcel(
  items: InventoryItem[],
  options: InventoryReportExcelOptions
) {
  const sheetData: (string | number)[][] = [
    ['IntelliShelf - Inventory Report'],
    ['Generated:', new Date().toLocaleString('en-US')],
    ['Branch:', options.branch || 'All Branches'],
  ]

  if (options.dateFrom || options.dateTo) {
    sheetData.push([
      'Date Range:',
      `${options.dateFrom || 'Start'} to ${options.dateTo || 'End'}`,
    ])
  }

  sheetData.push(
    [''],
    ['Total Inventory Value'],
    [options.totalInventoryValue],
    [options.branchScopeLabel],
    [''],
    ['Low Stock Value'],
    [options.lowStockValue],
    ['Needs reordering'],
    [''],
    ['At Risk Value'],
    [options.atRiskValue],
    ['Expiring soon'],
    [''],
    ['Inventory Report Preview'],
    ['Sample data from current filters'],
    [''],
    ['Item', 'SKU', 'Quantity', 'Estimated Value', 'Status'],
    ...buildInventoryPreviewRows(items),
  )

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  ws['!cols'] = [
    { wch: 30 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report Preview')

  const filename = `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}

/**
 * Export audit logs to Excel
 */
export function exportAuditLogsExcel(activities: Activity[]) {
  // Prepare data with all activity log records
  const data = activities.map((activity, index) => ({
    '#': index + 1,
    'User': activity.user,
    'Action': activity.action,
    'Item/Subject': activity.item || '-',
    'Branch': activity.branch,
    'Details': activity.details || '-',
    'Date': new Date(activity.timestamp).toLocaleDateString('en-US'),
    'Time': new Date(activity.timestamp).toLocaleTimeString('en-US'),
    'Full Timestamp': new Date(activity.timestamp).toLocaleString('en-US'),
  }))
  
  // Create workbook
  const wb = XLSX.utils.book_new()
  
  // Add activity logs sheet with all records
  const dataWs = XLSX.utils.json_to_sheet(data)
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 5 },   // #
    { wch: 20 },  // User
    { wch: 15 },  // Action
    { wch: 30 },  // Item/Subject
    { wch: 20 },  // Branch
    { wch: 40 },  // Details
    { wch: 12 },  // Date
    { wch: 12 },  // Time
    { wch: 20 },  // Full Timestamp
  ]
  dataWs['!cols'] = columnWidths
  
  XLSX.utils.book_append_sheet(wb, dataWs, 'Activity Logs')
  
  // Add summary sheet
  const summaryData = [
    ['IntelliShelf - Audit Logs Export'],
    [''],
    ['Generated:', new Date().toLocaleString('en-US')],
    ['Total Records:', activities.length],
    [''],
    ['Summary by Action:'],
  ]
  
  // Count activities by action type
  const actionCounts: Record<string, number> = {}
  activities.forEach(activity => {
    actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1
  })
  
  Object.entries(actionCounts).forEach(([action, count]) => {
    summaryData.push([action, count])
  })
  
  summaryData.push([''])
  summaryData.push(['Summary by Branch:'])
  
  // Count activities by branch
  const branchCounts: Record<string, number> = {}
  activities.forEach(activity => {
    branchCounts[activity.branch] = (branchCounts[activity.branch] || 0) + 1
  })
  
  Object.entries(branchCounts).forEach(([branch, count]) => {
    summaryData.push([branch, count])
  })
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  
  // Set column widths for summary
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 15 }]
  
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
  
  // Save file
  const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}
