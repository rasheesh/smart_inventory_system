import { prisma } from '../lib/prisma'
import { ItemStatus, Prisma } from '@prisma/client'
import { describeChangedFields, logActivity } from './activity.service'

export interface InventoryFilters {
  branchId?: string
  status?: ItemStatus
  searchQuery?: string
}

export interface InventoryByBranchResult {
  branch: string
  items: number
  value: number
}

export interface ExpirationTimelinePeriod {
  period: string
  count: number
  critical: number
}

/**
 * Retrieve inventory items with optional filters.
 * If the user is a branch-manager, scope results to their assigned branch
 * (branch-managers do not have canAccessAllBranches permission).
 */
export async function getInventoryItems(
  filters: InventoryFilters,
  userRole: string,
  userBranch: string,
) {
  const where: Record<string, unknown> = {}

  // Branch-manager scoping: always restrict to their own branch
  if (userRole === 'branch-manager' || userRole === 'branch_manager') {
    where.branch = userBranch
  } else if (filters.branchId) {
    // Admin/staff can filter by a specific branch
    where.branch = filters.branchId
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.searchQuery) {
    where.OR = [
      { name: { contains: filters.searchQuery } },
      { sku: { contains: filters.searchQuery } },
    ]
  }

  return prisma.inventoryItem.findMany({ where })
}

/**
 * Aggregate inventory quantity (items count) and value (price * quantity) per branch.
 */
export async function getInventoryByBranch(): Promise<InventoryByBranchResult[]> {
  const items = await prisma.inventoryItem.findMany({
    select: {
      branch: true,
      quantity: true,
      price: true,
    },
  })

  const branchMap = new Map<string, { items: number; value: number }>()

  for (const item of items) {
    const existing = branchMap.get(item.branch) ?? { items: 0, value: 0 }
    branchMap.set(item.branch, {
      items: existing.items + item.quantity,
      value: existing.value + item.price * item.quantity,
    })
  }

  return Array.from(branchMap.entries()).map(([branch, agg]) => ({
    branch,
    items: agg.items,
    value: agg.value,
  }))
}

/**
 * Bucket inventory items into expiration time periods.
 * Each item appears in exactly one bucket based on days until expiry from today.
 *
 * Buckets:
 *   "Within 7 days"  — expiryDate between now and now+7 days
 *   "Within 30 days" — expiryDate between now+7 days and now+30 days
 *   "Within 90 days" — expiryDate between now+30 days and now+90 days
 *
 * critical = items with status 'expired' or 'expiring'
 */
export async function getExpirationTimeline(): Promise<ExpirationTimelinePeriod[]> {
  const now = new Date()
  const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const [within7, within30, within90] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: {
        expiryDate: {
          gte: now,
          lt: day7,
        },
      },
      select: { status: true },
    }),
    prisma.inventoryItem.findMany({
      where: {
        expiryDate: {
          gte: day7,
          lt: day30,
        },
      },
      select: { status: true },
    }),
    prisma.inventoryItem.findMany({
      where: {
        expiryDate: {
          gte: day30,
          lt: day90,
        },
      },
      select: { status: true },
    }),
  ])

  const isCritical = (status: ItemStatus) =>
    status === ItemStatus.expired || status === ItemStatus.expiring

  return [
    {
      period: 'Within 7 days',
      count: within7.length,
      critical: within7.filter((i) => isCritical(i.status)).length,
    },
    {
      period: 'Within 30 days',
      count: within30.length,
      critical: within30.filter((i) => isCritical(i.status)).length,
    },
    {
      period: 'Within 90 days',
      count: within90.length,
      critical: within90.filter((i) => isCritical(i.status)).length,
    },
  ]
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateInventoryItemData {
  name: string
  sku: string
  quantity: number
  price: number
  reorderLevel: number
  expiryDate: Date
  supplier: string
  branch: string
  status?: ItemStatus
  lastRestocked?: Date
}

export async function createInventoryItem(data: CreateInventoryItemData, actingUserId: string) {
  // Auto-determine status if not provided
  let status = data.status
  if (!status) {
    const now = new Date()
    const daysUntilExpiry = (data.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntilExpiry <= 0) {
      status = ItemStatus.expired
    } else if (daysUntilExpiry <= 30) {
      status = ItemStatus.expiring
    } else if (data.quantity <= data.reorderLevel) {
      status = ItemStatus.low_stock
    } else {
      status = ItemStatus.normal
    }
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        name: data.name,
        sku: data.sku,
        quantity: data.quantity,
        price: data.price,
        reorderLevel: data.reorderLevel,
        expiryDate: data.expiryDate,
        supplier: data.supplier,
        branch: data.branch,
        status,
        lastRestocked: data.lastRestocked ?? new Date(),
      },
    })
    await logActivity(
      {
        userId: actingUserId,
        action: 'Created',
        item: item.name,
        branch: item.branch,
        details: `SKU ${item.sku}, qty ${item.quantity}`,
      },
      tx,
    )
    return item
  })
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function getInventoryItemsForExport(userRole: string, userBranch: string) {
  const where: Prisma.InventoryItemWhereInput = {}
  if (userRole === 'branch-manager' || userRole === 'branch_manager') {
    where.branch = userBranch
  }

  return prisma.inventoryItem.findMany({
    where,
    orderBy: { name: 'asc' },
  })
}

// ─── Update & Delete ──────────────────────────────────────────────────────────

export interface UpdateInventoryItemData {
  name?: string
  sku?: string
  price?: number
  reorderLevel?: number
  expiryDate?: Date
  supplier?: string
  branch?: string
  status?: ItemStatus
}

export async function updateInventoryItem(
  id: string,
  data: UpdateInventoryItemData,
  actingUserId: string,
) {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!existing) {
    throw { status: 404, message: 'Item not found' }
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.update({
      where: { id },
      data,
    })
    await logActivity(
      {
        userId: actingUserId,
        action: 'Updated',
        item: item.name,
        branch: item.branch,
        details: describeChangedFields(data as Record<string, unknown>),
      },
      tx,
    )
    return item
  })
}

export async function deleteInventoryItem(id: string, actingUserId: string) {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!existing) {
    throw { status: 404, message: 'Item not found' }
  }

  return prisma.$transaction(async (tx) => {
    await tx.stockAdjustment.deleteMany({ where: { itemId: id } })
    await tx.inventoryItem.delete({ where: { id } })
    await logActivity(
      {
        userId: actingUserId,
        action: 'Deleted',
        item: existing.name,
        branch: existing.branch,
        details: `SKU ${existing.sku}`,
      },
      tx,
    )
  })
}

