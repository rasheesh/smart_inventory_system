/**
 * Test script — simulates adding 20 units to "Bigas (Rice)" (id=1)
 * which has qty=44, reorderLevel=50 (currently low_stock).
 * After adding 20, qty=64 > reorderLevel=50, so status should become normal.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function computeStatus(quantity: number, reorderLevel: number, expiryDate: Date): string {
  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / msPerDay
  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3) return 'expiring'
  if (daysUntilExpiry < 0) return 'expired'
  if (quantity === 0) return 'out_of_stock'
  if (quantity <= reorderLevel) return 'low_stock'
  return 'normal'
}

async function main() {
  const itemId = '1' // Bigas (Rice)
  const addQty = 20

  const before = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { name: true, quantity: true, reorderLevel: true, status: true, expiryDate: true },
  })
  if (!before) { console.log('Item not found'); return }

  console.log('BEFORE:', before)

  const newQty = before.quantity + addQty
  const newStatus = computeStatus(newQty, before.reorderLevel, before.expiryDate)
  console.log(`Computed new status for qty=${newQty}, reorder=${before.reorderLevel}: ${newStatus}`)

  // Use raw SQL to bypass Prisma enum validation
  await prisma.$executeRaw`
    UPDATE "InventoryItem"
    SET quantity = ${newQty}, status = ${newStatus}::"ItemStatus"
    WHERE id = ${itemId}
  `

  const after = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { name: true, quantity: true, reorderLevel: true, status: true },
  })
  console.log('AFTER:', after)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
