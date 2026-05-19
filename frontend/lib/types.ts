export type UserRole = 'admin' | 'branch-manager' | 'staff'

export interface InventoryItem {
  id: string
  name: string
  sku: string
  quantity: number
  price: number
  reorderLevel: number
  expiryDate: Date
  supplier: string
  branch: string
  status: 'normal' | 'low-stock' | 'expiring' | 'expired'
  lastRestocked: Date
}

export interface Branch {
  id: string
  name: string
  address: string
  city: string
  manager: string
  contact: string
  email: string
  status: 'active' | 'inactive'
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'branch-manager' | 'staff'
  assignedBranch: string
  status: 'active' | 'inactive'
  lastLogin: Date
}

export interface Activity {
  id: string
  user: string
  action: string
  item?: string
  branch: string
  timestamp: Date
  details?: string
}

export interface StockAdjustment {
  id: string
  itemId: string
  itemName: string
  type: 'add' | 'remove' | 'transfer'
  quantity: number
  fromBranch?: string
  toBranch?: string
  reason: string
  user: string
  timestamp: Date
}

export interface Alert {
  id: string
  type: 'low-stock' | 'expiring' | 'expired' | 'system'
  item?: string
  branch?: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: Date
  read: boolean
}

// ─── Payload types (data submitted to the API) ───────────────────────────────

export interface StockAdjustmentPayload {
  itemId: string
  quantity: number
  adjustmentType: 'add' | 'remove' | 'transfer'
  reason: string
  fromBranch?: string
  toBranch?: string
}

// ─── Filter types (query / filter parameters) ────────────────────────────────

export interface InventoryFilters {
  searchQuery?: string
  branchId?: string | null
  status?: InventoryItem['status'] | 'all'
}

export interface AlertFilters {
  type?: Alert['type'] | 'all'
  severity?: Alert['severity'] | 'all'
}

export interface ActivityFilters {
  searchUser?: string
  action?: string | 'all'
  branch?: string | 'all'
  searchItem?: string
  dateFrom?: string
  dateTo?: string
}

export interface AdvancedActivityFilters {
  branch: string
  searchItem: string
  dateFrom: string
  dateTo: string
}

export interface ReportFilters {
  dateFrom: string
  dateTo: string
  branchId: string | null
}

// ─── API return types ─────────────────────────────────────────────────────────

export interface AuditLogStats {
  last24Hours: number
  lastWeek: number
  activeUsers: number
}

export interface InventoryByBranchDataPoint {
  branch: string
  items: number
  value: number
}

export interface StockMovementDataPoint {
  week: string
  inbound: number
  outbound: number
  net: number
}

export interface ExpirationTimelineDataPoint {
  period: string
  count: number
  critical: number
}
