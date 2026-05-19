import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireMinRole } from '../middleware/rbac'
import {
  getInventoryItems,
  getInventoryByBranch,
  getExpirationTimeline,
  createInventoryItem,
  getInventoryItemsForExport,
  updateInventoryItem,
  deleteInventoryItem,
} from '../services/inventory.service'

const router = Router()

const validStatuses = ['normal', 'low_stock', 'expiring', 'expired'] as const

// ─── Frontend ↔ backend status mapping ────────────────────────────────────────

function toFrontendStatus(status: string): string {
  const map: Record<string, string> = {
    low_stock: 'low-stock',
    normal: 'normal',
    expiring: 'expiring',
    expired: 'expired',
  }
  return map[status] ?? status
}

function toBackendStatus(status: string): string {
  const map: Record<string, string> = {
    'low-stock': 'low_stock',
    normal: 'normal',
    expiring: 'expiring',
    expired: 'expired',
  }
  return map[status] ?? status
}

// ─── Query schema ─────────────────────────────────────────────────────────────

const inventoryQuerySchema = z.object({
  branchId: z.string().optional(),
  status: z.enum(validStatuses).optional(),
  searchQuery: z.string().optional(),
})

// ─── Create schema ────────────────────────────────────────────────────────────

const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().min(0, 'Quantity must be >= 0'),
  price: z.number().min(0, 'Price must be >= 0'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be >= 0'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  branch: z.string().min(1, 'Branch is required'),
})

// ─── Update schema ────────────────────────────────────────────────────────────

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  quantity: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  expiryDate: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
})

// ─── GET /api/inventory ───────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  const parsed = inventoryQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    const statusError = parsed.error.errors.find((e) => e.path.includes('status'))
    if (statusError) {
      res.status(400).json({ message: 'Invalid status value', field: 'status' })
      return
    }
    res.status(400).json({ message: 'Invalid query parameters', errors: parsed.error.flatten() })
    return
  }

  const { branchId, status, searchQuery } = parsed.data
  const userRole = req.user!.role
  const userBranch = req.user!.branch

  try {
    const items = await getInventoryItems(
      { branchId, status, searchQuery },
      userRole,
      userBranch,
    )
    // Map status to frontend format (low_stock → low-stock)
    res.json(items.map((item) => ({ ...item, status: toFrontendStatus(item.status) })))
  } catch (err) {
    console.error('[inventory] GET / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── POST /api/inventory ──────────────────────────────────────────────────────

router.post('/', authenticate, requireMinRole('branch-manager'), async (req, res) => {
  const parsed = createItemSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    return
  }

  try {
    const item = await createInventoryItem(
      {
        ...parsed.data,
        expiryDate: new Date(parsed.data.expiryDate),
      },
      req.user!.userId,
    )
    res.status(201).json({ ...item, status: toFrontendStatus(item.status) })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ message: 'An item with this SKU already exists' })
      return
    }
    console.error('[inventory] POST / error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── PUT /api/inventory/:id ───────────────────────────────────────────────────

router.put('/:id', authenticate, requireMinRole('branch-manager'), async (req, res) => {
  const parsed = updateItemSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    return
  }

  try {
    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.expiryDate) {
      updateData.expiryDate = new Date(parsed.data.expiryDate)
    }

    const item = await updateInventoryItem(
      req.params.id as string,
      updateData,
      req.user!.userId,
    )
    res.json({ ...item, status: toFrontendStatus(item.status) })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string }
    if (e.status === 404 || e.code === 'P2025') {
      res.status(404).json({ message: e.message ?? 'Item not found' })
      return
    }
    console.error('[inventory] PUT /:id error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── DELETE /api/inventory/:id ────────────────────────────────────────────────

router.delete('/:id', authenticate, requireMinRole('branch-manager'), async (req, res) => {
  try {
    await deleteInventoryItem(req.params.id as string, req.user!.userId)
    res.json({ message: 'Item deleted successfully' })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string }
    if (e.status === 404 || e.code === 'P2025') {
      res.status(404).json({ message: e.message ?? 'Item not found' })
      return
    }
    console.error('[inventory] DELETE /:id error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── GET /api/inventory/export ────────────────────────────────────────────────

router.get('/export', authenticate, async (req, res) => {
  const userRole = req.user!.role
  const userBranch = req.user!.branch

  try {
    const items = await getInventoryItemsForExport(userRole, userBranch)

    // Build CSV
    const headers = [
      'Name',
      'SKU',
      'Quantity',
      'Price',
      'Reorder Level',
      'Expiry Date',
      'Supplier',
      'Branch',
      'Status',
      'Last Restocked',
    ]

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const rows = items.map((item) =>
      [
        escapeCSV(item.name),
        escapeCSV(item.sku),
        String(item.quantity),
        item.price.toFixed(2),
        String(item.reorderLevel),
        item.expiryDate.toISOString().split('T')[0],
        escapeCSV(item.supplier),
        escapeCSV(item.branch),
        toFrontendStatus(item.status),
        item.lastRestocked.toISOString().split('T')[0],
      ].join(','),
    )

    const csv = [headers.join(','), ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.csv')
    res.send(csv)
  } catch (err) {
    console.error('[inventory] GET /export error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── GET /api/inventory/by-branch ─────────────────────────────────────────────

router.get('/by-branch', authenticate, async (_req, res) => {
  try {
    const data = await getInventoryByBranch()
    res.json(data)
  } catch (err) {
    console.error('[inventory] GET /by-branch error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── GET /api/inventory/expiration-timeline ───────────────────────────────────

router.get('/expiration-timeline', authenticate, async (_req, res) => {
  try {
    const data = await getExpirationTimeline()
    res.json(data)
  } catch (err) {
    console.error('[inventory] GET /expiration-timeline error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
