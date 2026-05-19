import { prisma } from '../lib/prisma'
import { logActivity } from './activity.service'
import { computeItemStatus } from '../lib/item-status'
import { ItemStatus } from '@prisma/client'
import { z } from 'zod'

export const stockAdjustmentSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
  adjustmentType: z.enum(['add', 'remove', 'transfer']),
  reason: z.string().min(1, 'reason is required'),
  fromBranch: z.string().optional(),
  toBranch: z.string().optional(),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>

export async function getStockAdjustments() {
  return prisma.stockAdjustment.findMany({ orderBy: { timestamp: 'desc' } })
}

export async function getStockMovement() {
  const adjustments = await prisma.stockAdjustment.findMany({
    select: { type: true, quantity: true, timestamp: true },
    orderBy: { timestamp: 'asc' },
  })

  const weekMap = new Map<string, { inbound: number; outbound: number }>()

  for (const adj of adjustments) {
    const week = getISOWeekLabel(adj.timestamp)
    const existing = weekMap.get(week) ?? { inbound: 0, outbound: 0 }
    if (adj.type === 'add') {
      weekMap.set(week, { ...existing, inbound: existing.inbound + adj.quantity })
    } else {
      // remove and transfer both count as outbound
      weekMap.set(week, { ...existing, outbound: existing.outbound + adj.quantity })
    }
  }

  return Array.from(weekMap.entries()).map(([week, data]) => ({
    week,
    inbound: data.inbound,
    outbound: data.outbound,
    net: data.inbound - data.outbound,
  }))
}

function getISOWeekLabel(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export async function createStockAdjustment(input: StockAdjustmentInput, actingUserId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } })
  if (!item) {
    throw { status: 404, message: `Item with id '${input.itemId}' not found` }
  }

  const user = await prisma.user.findUnique({ where: { id: actingUserId } })
  if (!user) {
    throw { status: 404, message: 'User not found' }
  }

  if (input.adjustmentType === 'remove' || input.adjustmentType === 'transfer') {
    if (item.quantity < input.quantity) {
      throw {
        status: 422,
        message: `Insufficient stock: current quantity is ${item.quantity}, requested removal is ${input.quantity}`,
      }
    }
  }

  const quantityDelta = input.adjustmentType === 'add' ? input.quantity : -input.quantity

  const actionLabel =
    input.adjustmentType === 'add'
      ? 'Restocked'
      : input.adjustmentType === 'remove'
        ? 'Removed'
        : 'Transferred'

  // Compute new quantity and status before the transaction
  const newQuantity = item.quantity + quantityDelta
  const newStatus = computeItemStatus(newQuantity, item.reorderLevel, item.expiryDate)

  return prisma.$transaction(async (tx) => {
    const adjustment = await tx.stockAdjustment.create({
      data: {
        itemId: input.itemId,
        itemName: item.name,
        type: input.adjustmentType,
        quantity: input.quantity,
        fromBranch: input.fromBranch ?? null,
        toBranch: input.toBranch ?? null,
        reason: input.reason,
        user: user.name,
      },
    })

    // Use raw SQL to update quantity + status together.
    // This bypasses the stale Prisma generated enum (which may not include
    // out_of_stock until `prisma generate` is re-run after schema changes).
    await tx.$executeRaw`
      UPDATE "InventoryItem"
      SET quantity = ${newQuantity}, status = ${newStatus}::"ItemStatus"
      WHERE id = ${input.itemId}
    `

    await logActivity(
      {
        userId: actingUserId,
        action: actionLabel,
        item: item.name,
        branch: item.branch,
        details: `${input.adjustmentType} ${input.quantity} units — ${input.reason}`,
      },
      tx,
    )
    return adjustment
  })
}
