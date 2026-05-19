import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { InventoryItem, Activity } from './types'

function formatPeso(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatInventoryStatus(status: InventoryItem['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function computeInventoryReportMetrics(items: InventoryItem[]) {
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const lowStockValue = items
    .filter((i) => i.status === 'low-stock')
    .reduce((sum, item) => sum + item.quantity * item.price, 0)
  const expiringValue = items
    .filter((i) => i.status === 'expiring')
    .reduce((sum, item) => sum + item.quantity * item.price, 0)
  return { totalValue, lowStockValue, expiringValue }
}

function getBranchScopeLabel(branch?: string): string {
  const label = branch || 'All Branches'
  return label === 'All Branches' ? 'All items combined' : `Items in ${label}`
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }))
}

function mergeRow(ws: XLSX.WorkSheet, row: number, fromCol: number, toCol: number) {
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: row, c: fromCol }, e: { r: row, c: toCol } })
}

type PdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } }

const PDF_MARGIN = 14
const PDF_HEAD_BLUE: [number, number, number] = [59, 130, 246]
const PDF_SUMMARY_HEAD: [number, number, number] = [241, 245, 249]
const PDF_MUTED_TEXT: [number, number, number] = [100, 116, 139]

function statusPdfStyles(status: InventoryItem['status']): {
  fillColor?: [number, number, number]
  textColor?: [number, number, number]
} {
  switch (status) {
    case 'low-stock':
      return { fillColor: [254, 243, 199], textColor: [146, 64, 14] }
    case 'expiring':
    case 'expired':
      return { fillColor: [254, 226, 226], textColor: [185, 28, 28] }
    case 'out-of-stock':
      return { fillColor: [243, 244, 246], textColor: [75, 85, 99] }
    default:
      return { fillColor: [220, 252, 231], textColor: [22, 101, 52] }
  }
}

/**
 * Export inventory report to PDF — mirrors the Reports page layout:
 * filters, summary cards (values), and inventory preview table.
 */
export function exportInventoryReportPDF(
  items: InventoryItem[],
  filters: {
    branch?: string
    dateFrom?: string
    dateTo?: string
    reportType?: string
  }
) {
  const doc = new jsPDF() as PdfWithAutoTable
  const branchLabel = filters.branch || 'All Branches'
  const { totalValue, lowStockValue, expiringValue } = computeInventoryReportMetrics(items)
  const scopeLabel = getBranchScopeLabel(branchLabel)

  let y = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('IntelliShelf - Inventory Report', PDF_MARGIN, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`,
    PDF_MARGIN,
    y,
  )
  y += 6
  doc.text(`Branch: ${branchLabel}`, PDF_MARGIN, y)
  y += 6

  if (filters.dateFrom || filters.dateTo) {
    doc.text(
      `Date Range: ${filters.dateFrom || '—'} to ${filters.dateTo || '—'}`,
      PDF_MARGIN,
      y,
    )
    y += 6
  }

  y += 4
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Report Summary', PDF_MARGIN, y)

  autoTable(doc, {
    startY: y + 4,
    head: [['Total Inventory Value', 'Low Stock Value', 'At Risk Value']],
    body: [
      [formatPeso(totalValue), formatPeso(lowStockValue), formatPeso(expiringValue)],
      [scopeLabel, 'Needs reordering', 'Expiring soon'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: PDF_SUMMARY_HEAD,
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: { fontSize: 9, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { cellWidth: 60 },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fontSize = 11
        data.cell.styles.textColor = [15, 23, 42]
      }
      if (data.section === 'body' && data.row.index === 1) {
        data.cell.styles.fontSize = 8
        data.cell.styles.textColor = PDF_MUTED_TEXT
      }
    },
  })

  const afterSummaryY = (doc.lastAutoTable?.finalY ?? y) + 12

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Inventory Report Preview', PDF_MARGIN, afterSummaryY)

  const tableData = items.map((item) => [
    item.name,
    item.sku,
    item.quantity.toString(),
    formatPeso(item.quantity * item.price),
    formatInventoryStatus(item.status),
  ])

  autoTable(doc, {
    startY: afterSummaryY + 6,
    head: [['Item', 'SKU', 'Quantity', 'Estimated Value', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: PDF_HEAD_BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 28 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'center', cellWidth: 28 },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 4) return
      const status = items[data.row.index]?.status
      if (!status) return
      const styles = statusPdfStyles(status)
      if (styles.fillColor) data.cell.styles.fillColor = styles.fillColor
      if (styles.textColor) data.cell.styles.textColor = styles.textColor
      data.cell.styles.fontStyle = 'bold'
    },
  })

  const filename = `inventory_report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

/**
 * Export inventory report to Excel — mirrors the Reports page layout:
 * filters, summary cards (values), and inventory preview table.
 */
export function exportInventoryReportExcel(
  items: InventoryItem[],
  filters: {
    branch?: string
    dateFrom?: string
    dateTo?: string
    reportType?: string
  }
) {
  const branchLabel = filters.branch || 'All Branches'
  const { totalValue, lowStockValue, expiringValue } = computeInventoryReportMetrics(items)
  const scopeLabel = getBranchScopeLabel(branchLabel)

  const rows: (string | number)[][] = [
    ['IntelliShelf - Inventory Report'],
    ['Generated:', new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Branch:', branchLabel],
  ]

  if (filters.dateFrom || filters.dateTo) {
    rows.push([
      'Date Range:',
      `${filters.dateFrom || '—'} to ${filters.dateTo || '—'}`,
    ])
  }

  rows.push(
    [],
    ['Report Summary'],
    ['', 'Total Inventory Value', 'Low Stock Value', 'At Risk Value'],
    ['', formatPeso(totalValue), formatPeso(lowStockValue), formatPeso(expiringValue)],
    ['', scopeLabel, 'Needs reordering', 'Expiring soon'],
    [],
    ['Inventory Report Preview'],
    ['Item', 'SKU', 'Quantity', 'Estimated Value', 'Status'],
  )

  for (const item of items) {
    rows.push([
      item.name,
      item.sku,
      item.quantity,
      formatPeso(item.quantity * item.price),
      formatInventoryStatus(item.status),
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const lastCol = 4

  mergeRow(ws, 0, 0, lastCol)

  const summaryTitleRow = rows.findIndex((r) => r[0] === 'Report Summary')
  if (summaryTitleRow >= 0) mergeRow(ws, summaryTitleRow, 0, lastCol)

  const previewTitleRow = rows.findIndex((r) => r[0] === 'Inventory Report Preview')
  if (previewTitleRow >= 0) mergeRow(ws, previewTitleRow, 0, lastCol)

  const tableHeaderRow = rows.findIndex((r) => r[0] === 'Item' && r[1] === 'SKU')
  if (tableHeaderRow >= 0 && items.length > 0) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: tableHeaderRow, c: 0 },
        e: { r: rows.length - 1, c: lastCol },
      }),
    }
  }

  setColumnWidths(ws, [36, 18, 12, 20, 16])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report')

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
